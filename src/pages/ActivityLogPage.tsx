import { useMemo, useState } from "react";
import { listLogs, type LogEntry } from "../lib/logs";

type Props = { onBack: () => void };

export default function ActivityLogPage({ onBack }: Props) {
  const [q, setQ] = useState("");

  const logs = useMemo(() => listLogs(), []);
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return logs;
    return logs.filter((l) => {
      const hay = [l.time, l.user, l.action, l.requestId, l.detail].join(" ").toLowerCase();
      return hay.includes(needle);
    });
  }, [logs, q]);

  return (
    <div className="page">
      <div className="row">
        <div>
          <div className="h1">Activity Log</div>
          <div className="p">A history of edits and approvals.</div>
        </div>
        <div className="spacer" />
        <button className="btn" onClick={onBack}>Back to Dashboard</button>
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <div className="row">
          <div className="h2">Log Entries</div>
          <div className="spacer" />
          <input
            className="input"
            placeholder="Search logs..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>TIME</th>
                <th>USER</th>
                <th>ACTION</th>
                <th>REQUEST ID</th>
                <th>DETAIL</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ color: "var(--muted)" }}>
                    No logs yet.
                  </td>
                </tr>
              ) : (
                filtered.map((l: LogEntry) => (
                  <tr key={l.id}>
                    <td style={{ color: "var(--muted)" }}>{new Date(l.time).toLocaleString()}</td>
                    <td>{l.user}</td>
                    <td style={{ fontWeight: 800 }}>{l.action}</td>
                    <td>{l.requestId || "-"}</td>
                    <td style={{ color: "var(--muted)" }}>{l.detail || "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="footer">© 2026 Satit Bilingual School of Rangsit University (SBS)</div>
    </div>
  );
}
