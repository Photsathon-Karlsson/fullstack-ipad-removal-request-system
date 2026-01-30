import { useMemo, useState } from "react";
import { apiCreateRequest } from "../api/client";
import { addLog } from "../lib/logs";

type Props = {
  onBack: () => void;
  currentUser: string;
  onSubmitted: (id: string) => void;
};

type Notice = { type: "success" | "error"; text: string } | null;

type FormState = {
  parentName: string;
  phone1: string;
  phone2: string;
  email: string;
  studentName: string;
  classRoom: string;
  deviceSerial: string;
  deviceModel: string;
  reason: string;
};

const init: FormState = {
  parentName: "",
  phone1: "",
  phone2: "",
  email: "",
  studentName: "",
  classRoom: "",
  deviceSerial: "",
  deviceModel: "",
  reason: "",
};

function isEmail(s: string) {
  const t = (s || "").trim();
  return /^\S+@\S+\.\S+$/.test(t);
}

export default function FormPage({ onBack, currentUser, onSubmitted }: Props) {
  const [notice, setNotice] = useState<Notice>(null);
  const [form, setForm] = useState<FormState>(init);
  const [submitting, setSubmitting] = useState(false);

  const missing = useMemo(() => {
    const m: string[] = [];
    if (!form.parentName.trim()) m.push("Parent/Guardian Full Name");
    if (!form.phone1.trim()) m.push("Phone Number 1");

    if (!form.email.trim()) m.push("Email");
    if (form.email.trim() && !isEmail(form.email)) m.push("Email format");

    if (!form.studentName.trim()) m.push("Student Full Name");
    if (!form.classRoom.trim()) m.push("Class/Room");
    if (!form.deviceSerial.trim()) m.push("Device Serial Number");
    if (!form.deviceModel.trim()) m.push("Device Model");
    if (!form.reason.trim()) m.push("Reason");
    return m;
  }, [form]);

  function set<K extends keyof FormState>(k: K, v: string) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  async function handleSubmit() {
    setNotice(null);

    // ปุ่มกดได้เสมอ แต่ถ้าขาด → ขึ้นข้อความบนหน้า
    if (missing.length > 0) {
      const msg =
        missing[0] === "Email format"
          ? "รูปแบบอีเมลไม่ถูกต้อง"
          : `กรอกข้อมูลให้ครบ: ${missing.join(", ")}`;
      setNotice({ type: "error", text: msg });
      return;
    }

    try {
      setSubmitting(true);

      // ส่งเข้า backend ครบทุก field ที่ใช้ใน UI
      // backend require: ownerKey, serial, studentName, classRoom, reason
      const res = await apiCreateRequest({
        ownerKey: currentUser, // ผูกกับ user ที่ล็อกอิน

        parentName: form.parentName.trim(),
        phone: form.phone1.trim(),

        // เพิ่ม 3 ฟิลด์
        email: form.email.trim(),
        phone2: form.phone2.trim(), // optional (ส่ง "" ได้)
        deviceModel: form.deviceModel.trim(),

        studentName: form.studentName.trim(),
        classRoom: form.classRoom.trim(),
        serial: form.deviceSerial.trim(),
        reason: form.reason.trim(),

        note: "", // optional
        status: "submitted", // optional (backend จะ default ได้)
      });

      const createdId = res.request.id;

      addLog({
        user: currentUser,
        action: "CREATE_REQUEST",
        requestId: createdId,
        detail: "Created request (API)",
      });

      setNotice({ type: "success", text: "สร้างคำขอเรียบร้อย (ส่งเข้า Backend แล้ว)" });

      // ส่ง id กลับไปให้ router ไปหน้า details ได้
      onSubmitted(createdId);
    } catch (e: any) {
      setNotice({ type: "error", text: e?.message || "Submit failed" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page">
      <div className="row">
        <div>
          <div className="h1">iPad Removal Request Form</div>
          <div className="p">Fill in all fields and submit your request.</div>
        </div>
        <div className="spacer" />
        <button className="btn" onClick={onBack}>
          Back
        </button>
      </div>

      {notice ? (
        <div
          className="card"
          style={{
            marginTop: 14,
            borderColor:
              notice.type === "error"
                ? "rgba(255,0,0,0.25)"
                : "rgba(0,128,0,0.25)",
            background:
              notice.type === "error"
                ? "rgba(255,0,0,0.05)"
                : "rgba(0,128,0,0.05)",
          }}
        >
          <b>{notice.type === "error" ? "Error: " : "Success: "}</b>
          {notice.text}
        </div>
      ) : null}

      <div className="card" style={{ marginTop: 14 }}>
        <div className="h2">Request Details</div>

        <div className="formGrid">
          <Input
            label="Parent/Guardian Full Name"
            value={form.parentName}
            onChange={(v) => set("parentName", v)}
          />
          <Input
            label="Email"
            value={form.email}
            onChange={(v) => set("email", v)}
            placeholder="e.g. parent@email.com"
          />

          <Input
            label="Phone Number 1"
            value={form.phone1}
            onChange={(v) => set("phone1", v)}
          />
          <Input
            label="Phone Number 2"
            value={form.phone2}
            onChange={(v) => set("phone2", v)}
            placeholder="optional"
          />

          <Input
            label="Student Full Name"
            value={form.studentName}
            onChange={(v) => set("studentName", v)}
          />
          <Input
            label="Class/Room"
            value={form.classRoom}
            onChange={(v) => set("classRoom", v)}
            placeholder="e.g. P5/2"
          />

          <Input
            label="Device Serial Number"
            value={form.deviceSerial}
            onChange={(v) => set("deviceSerial", v)}
          />
          <Input
            label="Device Model"
            value={form.deviceModel}
            onChange={(v) => set("deviceModel", v)}
            placeholder="e.g. iPad 9th Gen"
          />

          <div className="spanAll">
            <div
              className="p"
              style={{ margin: 0, fontWeight: 800, color: "var(--text)" }}
            >
              Reason for Removal Request
            </div>
            <textarea
              value={form.reason}
              onChange={(e) => set("reason", e.target.value)}
              style={{
                width: "100%",
                marginTop: 8,
                minHeight: 140,
                borderRadius: 16,
                border: "1px solid var(--line)",
                padding: 12,
                outline: "none",
                resize: "vertical",
              }}
            />
          </div>
        </div>

        <div className="row" style={{ marginTop: 16, justifyContent: "flex-end" }}>
          <button className="btn" onClick={() => setForm(init)} disabled={submitting}>
            Reset
          </button>

          <button className="btn btn--dark" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Submitting..." : "Submit Request"}
          </button>
        </div>

        <div className="p" style={{ marginTop: 10, color: "var(--muted)" }}>
          หมายเหตุ: ตอนนี้ระบบส่งข้อมูลเข้าฝั่ง Backend ครบแล้ว (รวม Email/Phone2/Device Model)
        </div>
      </div>

      <div className="footer">© 2026 School System</div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <div className="p" style={{ margin: 0, fontWeight: 800, color: "var(--text)" }}>
        {label}
      </div>
      <input
        className="input"
        style={{ width: "100%", marginTop: 8 }}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
