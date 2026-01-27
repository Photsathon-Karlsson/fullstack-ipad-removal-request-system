import { useEffect, useMemo, useState } from "react";
import { apiListRequests } from "../api/client";

// ===== UI types (คงแบบเดิม) =====
type Props = {
  onOpenAccounts: () => void;
  onOpenActivityLog: () => void;
  onOpenForm: () => void;
  onViewRequest: (id: string) => void;
};

type FilterStatus = "ALL" | "Submitted" | "IT Approved";

// ===== Backend shape (จาก srcServer/store.ts) =====
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

  note: string;
  submittedAt: string;
  updatedAt: string;
};

// ===== View model สำหรับ UI ตารางเดิม =====
type RemovalRequestVM = {
  id: string;
  studentName: string;
  classRoom: string;
  deviceSerial: string;
  deviceModel: string; // backend ยังไม่มี → ใส่ "" ไว้
  status: "Submitted" | "IT Approved";
  updatedAt: string;
};

function toUiStatus(s: ApiStatus): "Submitted" | "IT Approved" {
  if (s === "it_approved") return "IT Approved";
  return "Submitted"; // submitted / pending_it = Submitted ใน UI ตอนนี้
}

function toVM(r: ApiRequestItem): RemovalRequestVM {
  return {
    id: r.id,
    studentName: r.studentName,
    classRoom: r.classRoom,
    deviceSerial: r.serial,
    deviceModel: "",
    status: toUiStatus(r.status),
    updatedAt: r.updatedAt || r.submittedAt,
  };
}

export default function DashboardPage({
  onOpenAccounts,
  onOpenActivityLog,
  onOpenForm,
  onViewRequest,
}: Props) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<FilterStatus>("ALL");
  const [tick, setTick] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [all, setAll] = useState<RemovalRequestVM[]>([]);

  // โหลดจาก API
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setError("");
        const data = (await apiListRequests()) as unknown as ApiRequestItem[];
        const vms = Array.isArray(data) ? data.map(toVM) : [];
        if (alive) setAll(vms);
      } catch (e: any) {
        if (alive) setError(e?.message || "Failed to load requests from API");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [tick]);

  const submittedCount = all.filter((r) => r.status === "Submitted").length;
  const approvedCount = all.filter((r) => r.status === "IT Approved").length;

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();

    return all.filter((r) => {
      const matchesQ =
        !qq ||
        [r.id, r.studentName, r.classRoom, r.deviceSerial, r.deviceModel]
          .join(" ")
          .toLowerCase()
          .includes(qq);

      const matchesStatus = status === "ALL" ? true : r.status === status;

      return matchesQ && matchesStatus;
    });
  }, [all, q, status]);

  return (
    <div className="page">
      <div className="row">
        <div>
          <div className="h1">Dashboard</div>
          <div className="p">Review and manage all requests.</div>
        </div>

        <div className="spacer" />

        <input
          className="input"
          style={{ width: 320 }}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search (student / class / request ID / serial / model)"
        />

        <select
          className="input"
          style={{ width: 170 }}
          value={status}
          onChange={(e) => setStatus(e.target.value as FilterStatus)}
        >
          <option value="ALL">All statuses</option>
          <option value="Submitted">Submitted</option>
          <option value="IT Approved">IT Approved</option>
        </select>

        <button className="btn" onClick={onOpenForm}>
          Open Form
        </button>
        <button className="btn" onClick={onOpenAccounts}>
          Accounts
        </button>
      </div>

      <div className="row" style={{ marginTop: 14 }}>
        <button className="btn" onClick={onOpenActivityLog}>
          Activity Log
        </button>
      </div>

      <div className="row" style={{ marginTop: 14 }}>
        <StatCard title="Submitted" value={submittedCount} />
        <StatCard title="IT Approved" value={approvedCount} />
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <div className="row">
          <div className="h2">Requests</div>
          <div className="spacer" />
          <div className="p" style={{ color: "var(--muted)" }}>
            Click “View” to open details.
          </div>
          <button className="btn" onClick={() => setTick((x) => x + 1)}>
            Refresh
          </button>
        </div>

        {/* loading / error */}
        {loading ? (
          <div className="p" style={{ marginTop: 12, color: "var(--muted)" }}>
            Loading...
          </div>
        ) : error ? (
          <div className="card" style={{ marginTop: 12, borderColor: "rgba(255,0,0,0.25)", background: "rgba(255,0,0,0.05)" }}>
            <b>Error: </b>{error}
          </div>
        ) : null}

        <div className="tableWrap" style={{ marginTop: 10 }}>
          <table>
            <thead>
              <tr>
                <th>REQUEST ID</th>
                <th>STUDENT</th>
                <th>CLASS</th>
                <th>STATUS</th>
                <th>UPDATED</th>
                <th style={{ textAlign: "right" }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {!loading && !error && filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ color: "var(--muted)" }}>
                    No requests found.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <Row key={r.id} r={r} onView={() => onViewRequest(r.id)} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="footer">
        © 2026 Satit Bilingual School of Rangsit University (SBS)
      </div>
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="card" style={{ flex: 1 }}>
      <div className="p" style={{ color: "var(--muted)", margin: 0 }}>
        {title}
      </div>
      <div style={{ fontSize: 28, fontWeight: 900, marginTop: 6 }}>{value}</div>
    </div>
  );
}

function Row({ r, onView }: { r: RemovalRequestVM; onView: () => void }) {
  return (
    <tr>
      <td>{r.id}</td>
      <td>{r.studentName}</td>
      <td>{r.classRoom}</td>
      <td style={{ fontWeight: 800 }}>{r.status}</td>
      <td style={{ color: "var(--muted)" }}>
        {new Date(r.updatedAt).toLocaleString()}
      </td>
      <td style={{ textAlign: "right" }}>
        <button className="btn" onClick={onView}>
          View
        </button>
      </td>
    </tr>
  );
}
