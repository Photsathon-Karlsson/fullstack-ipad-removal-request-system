type Props = { onBack: () => void };

export default function RegisterPage({ onBack }: Props) {
  return (
    <div className="page">
      <div className="row">
        <div>
          <div className="h1">Register</div>
          <div className="p">Create a new account (staff only).</div>
        </div>
        <div className="spacer" />
        <button className="btn" onClick={onBack}>Back</button>
      </div>

      <div className="row" style={{ alignItems: "stretch", marginTop: 14 }}>
        <div className="card" style={{ flex: 1, minWidth: 320 }}>
          <div className="h2">Account Details</div>

          <div style={{ marginTop: 14 }}>
            <div className="p" style={{ margin: 0, fontWeight: 800, color: "var(--text)" }}>Role</div>
            <select className="select" defaultValue="it" style={{ width: "100%", marginTop: 8 }}>
              <option value="it">IT</option>
            </select>
            <div className="p" style={{ fontSize: 12 }}>
              IT-only system (role fixed).
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            <div className="p" style={{ margin: 0, fontWeight: 800, color: "var(--text)" }}>Username / Email</div>
            <input className="input" placeholder="e.g. it2@school.edu" style={{ width: "100%", marginTop: 8 }} />
            <div className="p" style={{ fontSize: 12 }}>Use this value to log in.</div>
          </div>

          <div className="row" style={{ marginTop: 14 }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div className="p" style={{ margin: 0, fontWeight: 800, color: "var(--text)" }}>Password</div>
              <input className="input" type="password" style={{ width: "100%", marginTop: 8 }} />
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div className="p" style={{ margin: 0, fontWeight: 800, color: "var(--text)" }}>Confirm Password</div>
              <input className="input" type="password" style={{ width: "100%", marginTop: 8 }} />
            </div>
          </div>

          <div className="row" style={{ marginTop: 16, justifyContent: "flex-end" }}>
            <button className="btn btn--dark" onClick={() => alert("STEP B.2 จะทำ logic สร้างบัญชีจริง")}>
              Create Account
            </button>
          </div>
        </div>

        <div className="card card--soft" style={{ flex: 1, minWidth: 320 }}>
          <div className="h2">Guidelines</div>
          <ul style={{ marginTop: 12, color: "var(--text)", lineHeight: 1.7 }}>
            <li>Use unique Username/Email</li>
            <li>Password should be at least 4 characters</li>
            <li>System is IT-only</li>
          </ul>
        </div>
      </div>

      <div className="footer">© 2026 School System</div>
    </div>
  );
}
