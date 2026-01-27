import React, { useEffect, useMemo, useState } from "react";
import { apiGetRequest, apiPatchRequest } from "../api/client";
import { addLog } from "../lib/logs";
import { printRequest } from "../lib/print";

type Props = {
  requestId: string;
  currentUser: string;
  onBack: () => void;
};

type Notice = { type: "success" | "error"; text: string } | null;

// Backend shape 
type ApiStatus = "submitted" | "pending_it" | "it_approved";

type ApiRequestItem = {
  id: string;
  ownerKey: string;
  status: ApiStatus;

  parentName: string;
  phone: string;
  studentName: string;
  classRoom: string;
  serial: string;
  reason: string;

  // optional fields (เผื่อ backend เพิ่ม/ลด)
  email?: string | null;
  phone2?: string | null;
  deviceModel?: string | null;

  note: string;
  submittedAt: string;
  updatedAt: string;
};

// UI shape (คงของเดิมไว้ เพื่อไม่กระทบ print/UI)  
type RemovalRequestUI = {
  id: string;
  status: "Submitted" | "IT Approved";

  parentName: string;
  phone1: string;
  phone2: string;
  email: string;

  studentName: string;
  classRoom: string;
  deviceSerial: string;
  deviceModel: string;

  reason: string;
  createdAt: string;
  updatedAt: string;
};

function toUiStatus(s: ApiStatus): "Submitted" | "IT Approved" {
  if (s === "it_approved") return "IT Approved";
  return "Submitted";
}

function safeStr(v: unknown) {
  return (v ?? "").toString();
}

// “-” ใช้แค่ตอนแสดงผล ห้ามบันทึก/ห้ามส่ง API
function cleanOptional(v: unknown) {
  const s = safeStr(v).trim();
  return s === "-" ? "" : s;
}

function toUI(r: ApiRequestItem): RemovalRequestUI {
  return {
    id: r.id,
    status: toUiStatus(r.status),

    parentName: r.parentName || "",
    phone1: r.phone || "",
    phone2: cleanOptional(r.phone2 ?? ""), // ไม่ทิ้งค่า
    email: cleanOptional(r.email ?? ""),   // ไม่ทิ้งค่า

    studentName: r.studentName || "",
    classRoom: r.classRoom || "",
    deviceSerial: r.serial || "",
    deviceModel: cleanOptional(r.deviceModel ?? ""), // ไม่ทิ้งค่า

    reason: r.reason || "",
    createdAt: r.submittedAt || new Date().toISOString(),
    updatedAt: r.updatedAt || r.submittedAt || new Date().toISOString(),
  };
}

type EditState = {
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

export default function RequestDetailsPage({ requestId, currentUser, onBack }: Props) {
  const [notice, setNotice] = useState<Notice>(null);
  const [tick, setTick] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  const [reqApi, setReqApi] = useState<ApiRequestItem | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [edit, setEdit] = useState<EditState | null>(null);

  // โหลดรายละเอียดจาก API
  useEffect(() => {
    let alive = true;

    (async () => {
      if (!requestId) return;
      try {
        setLoading(true);
        setError("");
        const data = (await apiGetRequest(requestId)) as unknown as ApiRequestItem;
        if (alive) setReqApi(data);
      } catch (e: any) {
        if (alive) setError(e?.message || "Failed to load request");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [requestId, tick]);

  function refresh() {
    setTick((x) => x + 1);
  }

  const req = useMemo<RemovalRequestUI | null>(() => {
    if (!reqApi) return null;
    return toUI(reqApi);
  }, [reqApi]);

  async function approve() {
    setNotice(null);
    try {
      if (!requestId) return;

      const res = await apiPatchRequest(requestId, {
        status: "it_approved",
        user: currentUser,
      });

      // refresh data
      setReqApi(res.request as unknown as ApiRequestItem);

      addLog({
        user: currentUser,
        action: "APPROVE",
        requestId,
        detail: "IT Approved request",
      });

      setNotice({ type: "success", text: "The status has been updated to IT Approved." });

      // Approve แล้วบังคับออกจากโหมดแก้ไขทันที
      setIsEditing(false);
      setEdit(null);
    } catch (e: any) {
      setNotice({ type: "error", text: e?.message || "Approve failed" });
    }
  }

  function startEdit() {
    setNotice(null);
    if (!req) return;

    // แก้ได้เฉพาะ Submitted
    if (req.status !== "Submitted") {
      setNotice({ type: "error", text: "Only submitted items can be edited." });
      return;
    }

    setIsEditing(true);
    // preload “ค่าจริง” (ไม่มี -)
    setEdit({
      parentName: req.parentName,
      phone1: req.phone1,
      phone2: req.phone2 || "",      // อย่าใส่ "-"
      email: req.email || "",        // อย่าใส่ "-"
      studentName: req.studentName,
      classRoom: req.classRoom,
      deviceSerial: req.deviceSerial,
      deviceModel: req.deviceModel || "", // อย่าใส่ "-"
      reason: req.reason,
    });
  }

  function cancelEdit() {
    setIsEditing(false);
    setEdit(null);
  }

  async function saveEdit() {
    setNotice(null);
    if (!edit) return;

    try {
      // sanitize ก่อนส่ง (กัน "-" หลุด)
      const email = cleanOptional(edit.email);
      const phone2 = cleanOptional(edit.phone2);
      const deviceModel = cleanOptional(edit.deviceModel);

      // ส่ง field หลัก + optional fields (ถ้า backend รองรับก็จะเก็บ)
      const res = await apiPatchRequest(requestId, {
        user: currentUser,
        parentName: edit.parentName.trim(),
        phone: edit.phone1.trim(),
        studentName: edit.studentName.trim(),
        classRoom: edit.classRoom.trim(),
        serial: edit.deviceSerial.trim(),
        reason: edit.reason.trim(),

        // optional (ปลอดภัย: เป็น "" ไม่ใช่ "-")
        email,
        phone2,
        deviceModel,

      });

      setReqApi(res.request as unknown as ApiRequestItem);

      addLog({
        user: currentUser,
        action: "EDIT_REQUEST",
        requestId,
        detail: "Edited request details",
      });

      setNotice({ type: "success", text: "Changes saved successfully." });
      setIsEditing(false);
      setEdit(null);
    } catch (e: any) {
      setNotice({ type: "error", text: e?.message || "Edit failed" });
    }
  }

  function doPrint() {
    setNotice(null);
    if (!req) {
      setNotice({ type: "error", text: "Request not found." });
      return;
    }

    // ต้อง Approved ก่อน
    if (req.status !== "IT Approved") {
      setNotice({ type: "error", text: "Approval is required before printing the PDF." });
      return;
    }

    printRequest(req as any);
    addLog({
      user: currentUser,
      action: "PRINT_PDF",
      requestId: req.id,
      detail: "Printed request PDF",
    });
  }

  if (loading) {
    return (
      <div className="page">
        <div className="row">
          <div>
            <div className="h1">Request Details</div>
            <div className="p">Loading...</div>
          </div>
          <div className="spacer" />
          <button className="btn" onClick={onBack}>
            Back
          </button>
        </div>
        <div className="footer">© 2026 School System</div>
      </div>
    );
  }

  if (error || !req) {
    return (
      <div className="page">
        <div className="row">
          <div>
            <div className="h1">Request Details</div>
            <div className="p">Request not found.</div>
            {error ? (
              <div className="p" style={{ marginTop: 10, color: "crimson" }}>
                {error}
              </div>
            ) : null}
          </div>
          <div className="spacer" />
          <button className="btn" onClick={onBack}>
            Back
          </button>
        </div>
        <div className="footer">© 2026 School System</div>
      </div>
    );
  }

  const canPrint = req.status === "IT Approved";
  const canEdit = req.status === "Submitted";
  const isApproved = req.status === "IT Approved";

  return (
    <div className="page">
      <div className="row">
        <div>
          <div className="h1">Request Details</div>
          <div className="p">View / approve / edit / print PDF</div>
        </div>
        <div className="spacer" />
        <button className="btn" onClick={onBack}>
          Back to Dashboard
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
        <div className="row">
          <div className="h2">{req.id}</div>
          <div className="spacer" />
          <div className="p" style={{ fontWeight: 900 }}>
            Status: {req.status}
          </div>
        </div>

        {!isEditing ? <ViewMode req={req} /> : <EditMode edit={edit!} setEdit={setEdit} />}

        <div className="row" style={{ marginTop: 16, justifyContent: "flex-end" }}>
          <button className="btn" onClick={doPrint} disabled={!canPrint}>
            Print PDF
          </button>

          {!isEditing ? (
            <button className="btn" onClick={startEdit} disabled={!canEdit}>
              Edit
            </button>
          ) : (
            <>
              <button className="btn" onClick={cancelEdit}>
                Cancel
              </button>
              <button className="btn" onClick={saveEdit}>
                Save
              </button>
            </>
          )}

          <button className="btn btn--dark" onClick={approve} disabled={isApproved}>
            Approve
          </button>
        </div>

        <div className="p" style={{ marginTop: 10, color: "var(--muted)" }}>
          {isApproved ? "Approved items cannot be edited." : "Editable only in Submitted status."}
          {!canPrint ? " • Approval is required before printing the PDF." : ""}
        </div>

        <div className="row" style={{ marginTop: 12, justifyContent: "flex-end" }}>
          <button className="btn" onClick={refresh}>
            Refresh
          </button>
        </div>
      </div>

      <div className="footer">© 2026 School System</div>
    </div>
  );
}

function ViewMode({ req }: { req: RemovalRequestUI }) {
  return (
    <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
      <Field label="Parent/Guardian Full Name" value={req.parentName} />
      <Field label="Email" value={req.email?.trim() ? req.email : "-"} />
      <Field label="Phone Number 1" value={req.phone1} />
      <Field label="Phone Number 2" value={req.phone2?.trim() ? req.phone2 : "-"} />
      <Field label="Student Full Name" value={req.studentName} />
      <Field label="Class/Room" value={req.classRoom} />
      <Field label="Device Serial Number" value={req.deviceSerial} />
      <Field label="Device Model" value={req.deviceModel?.trim() ? req.deviceModel : "-"} />
      <Field label="Created" value={new Date(req.createdAt).toLocaleString()} />
      <Field label="Updated" value={new Date(req.updatedAt).toLocaleString()} />

      <div style={{ gridColumn: "1 / -1" }}>
        <div className="p" style={{ margin: 0, fontWeight: 800, color: "var(--text)" }}>
          Reason
        </div>
        <div style={{ marginTop: 8, color: "var(--text)", whiteSpace: "pre-wrap" }}>
          {req.reason}
        </div>
      </div>
    </div>
  );
}

function EditMode({
  edit,
  setEdit,
}: {
  edit: EditState;
  setEdit: React.Dispatch<React.SetStateAction<EditState | null>>;
}) {
  const set = (k: keyof EditState, v: string) =>
    setEdit((p) => ({ ...(p as EditState), [k]: v }));

  return (
    <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
      <Input
        label="Parent/Guardian Full Name"
        value={edit.parentName}
        onChange={(v) => set("parentName", v)}
      />
      <Input label="Email" value={edit.email} onChange={(v) => set("email", v)} />

      <Input label="Phone Number 1" value={edit.phone1} onChange={(v) => set("phone1", v)} />
      <Input label="Phone Number 2" value={edit.phone2} onChange={(v) => set("phone2", v)} />

      <Input
        label="Student Full Name"
        value={edit.studentName}
        onChange={(v) => set("studentName", v)}
      />
      <Input label="Class/Room" value={edit.classRoom} onChange={(v) => set("classRoom", v)} />

      <Input
        label="Device Serial Number"
        value={edit.deviceSerial}
        onChange={(v) => set("deviceSerial", v)}
      />
      <Input
        label="Device Model"
        value={edit.deviceModel}
        onChange={(v) => set("deviceModel", v)}
      />

      <div style={{ gridColumn: "1 / -1" }}>
        <div className="p" style={{ margin: 0, fontWeight: 800, color: "var(--text)" }}>
          Reason
        </div>
        <textarea
          value={edit.reason}
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
  );
}

function Input({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
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
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="p" style={{ margin: 0, fontWeight: 800, color: "var(--text)" }}>
        {label}
      </div>
      <div style={{ marginTop: 8 }}>{value}</div>
    </div>
  );
}
