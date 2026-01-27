import { useMemo, useState } from "react";
import {
  addAccount,
  deleteAccount,
  editAccount,
  listAccounts,
  type ITAccount,
} from "../lib/auth";

type Props = { onBack: () => void };

type Notice = { type: "success" | "error"; text: string } | null;

export default function AccountsPage({ onBack }: Props) {
  const [refresh, setRefresh] = useState(0);
  const [notice, setNotice] = useState<Notice>(null);

  const accounts = useMemo<ITAccount[]>(() => {
    void refresh;
    return listAccounts();
  }, [refresh]);

  // Add account
  const [newUser, setNewUser] = useState("");
  const [newPass, setNewPass] = useState("");

  // Edit account
  const [oldUsername, setOldUsername] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");

  // Delete account
  const [deleteUsername, setDeleteUsername] = useState("");

  function showSuccess(text: string) {
    setNotice({ type: "success", text });
  }
  function showError(text: string) {
    setNotice({ type: "error", text });
  }
  function doRefresh() {
    setRefresh((x) => x + 1);
  }

  function handleAdd() {
    setNotice(null);
    try {
      addAccount(newUser, newPass);
      setNewUser("");
      setNewPass("");
      doRefresh();
      showSuccess("เพิ่มบัญชีเรียบร้อย");
    } catch (e: any) {
      showError(e?.message || "Add failed");
    }
  }

  function handleEdit() {
    setNotice(null);
    try {
      editAccount({
        oldUsername,
        oldPassword,
        newUsername: newUsername || undefined,
        newPassword: newPassword || undefined,
      });
      setOldPassword("");
      setNewPassword("");
      doRefresh();
      showSuccess("แก้ไขบัญชีเรียบร้อย");
    } catch (e: any) {
      showError(e?.message || "Edit failed");
    }
  }

  function handleDelete() {
    setNotice(null);
    try {
      deleteAccount(deleteUsername);
      setDeleteUsername("");
      doRefresh();
      showSuccess("ลบบัญชีเรียบร้อย");
    } catch (e: any) {
      showError(e?.message || "Delete failed");
    }
  }

  return (
    <div className="page">
      <div className="row">
        <div>
          <div className="h1">Accounts</div>
          <div className="p">Manage IT accounts (add / edit / delete).</div>
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

      <div className="row" style={{ alignItems: "stretch", marginTop: 14 }}>
        <div className="card" style={{ flex: 1, minWidth: 320 }}>
          <div className="h2">Add Account</div>

          <div style={{ marginTop: 12 }}>
            <div className="p" style={labelStyle}>
              Username
            </div>
            <input
              className="input"
              style={{ width: "100%", marginTop: 8 }}
              value={newUser}
              onChange={(e) => setNewUser(e.target.value)}
              placeholder="e.g. it2"
            />
          </div>

          <div style={{ marginTop: 12 }}>
            <div className="p" style={labelStyle}>
              Password
            </div>
            <input
              className="input"
              type="password"
              style={{ width: "100%", marginTop: 8 }}
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              placeholder="min 4 chars"
            />
          </div>

          <div className="row" style={{ marginTop: 14, justifyContent: "flex-end" }}>
            <button className="btn btn--dark" onClick={handleAdd}>
              Create Account
            </button>
          </div>
        </div>

        <div className="card" style={{ flex: 1, minWidth: 320 }}>
          <div className="h2">Edit Account</div>
          <div className="p" style={{ marginTop: 6 }}>
            กรอกบัญชีเดิมเพื่อยืนยัน แล้วกรอกข้อมูลใหม่ที่ต้องการเปลี่ยน
          </div>

          <div style={{ marginTop: 12 }}>
            <div className="p" style={labelStyle}>
              Old username
            </div>
            <input
              className="input"
              style={{ width: "100%", marginTop: 8 }}
              value={oldUsername}
              onChange={(e) => setOldUsername(e.target.value)}
              placeholder="e.g. it2"
            />
          </div>

          <div style={{ marginTop: 12 }}>
            <div className="p" style={labelStyle}>
              Old password
            </div>
            <input
              className="input"
              type="password"
              style={{ width: "100%", marginTop: 8 }}
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              placeholder="required"
            />
          </div>

          <div style={{ marginTop: 12 }}>
            <div className="p" style={labelStyle}>
              New username (optional)
            </div>
            <input
              className="input"
              style={{ width: "100%", marginTop: 8 }}
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              placeholder="leave blank if not changing"
            />
          </div>

          <div style={{ marginTop: 12 }}>
            <div className="p" style={labelStyle}>
              New password (optional)
            </div>
            <input
              className="input"
              type="password"
              style={{ width: "100%", marginTop: 8 }}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="min 4 chars"
            />
          </div>

          <div className="row" style={{ marginTop: 14, justifyContent: "flex-end" }}>
            <button className="btn btn--dark" onClick={handleEdit}>
              Confirm
            </button>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <div className="row">
          <div className="h2">Accounts</div>
          <div className="spacer" />
          <button className="btn" onClick={doRefresh}>
            Refresh
          </button>
        </div>

        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>USERNAME</th>
                <th>CREATED</th>
              </tr>
            </thead>
            <tbody>
              {accounts.length === 0 ? (
                <tr>
                  <td colSpan={2} style={{ color: "var(--muted)" }}>
                    No accounts
                  </td>
                </tr>
              ) : (
                accounts.map((a) => (
                  <tr key={a.username}>
                    <td>{a.username}</td>
                    <td style={{ color: "var(--muted)" }}>
                      {new Date(a.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="row" style={{ marginTop: 14 }}>
          <div style={{ flex: 1, minWidth: 260 }}>
            <div className="p" style={labelStyle}>
              Delete account
            </div>
            <input
              className="input"
              style={{ width: "100%", marginTop: 8 }}
              value={deleteUsername}
              onChange={(e) => setDeleteUsername(e.target.value)}
              placeholder="type username to delete (except it)"
            />
          </div>
          <div className="spacer" />
          <button className="btn" onClick={handleDelete}>
            Delete
          </button>
        </div>
      </div>

      <div className="footer">© 2026 Satit Bilingual School of Rangsit University (SBS)</div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  margin: 0,
  fontWeight: 800,
  color: "var(--text)",
};
