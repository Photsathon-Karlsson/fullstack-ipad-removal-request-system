import { useState } from "react";
import { login, type SessionUser } from "../lib/auth";

type Props = {
  onLoginSuccess: (user: SessionUser) => void;
};

export default function LoginPage({ onLoginSuccess }: Props) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string>("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");

    try {
      const u = login(username, password);
      onLoginSuccess(u);
    } catch (error: any) {
      setErr(error?.message || "Login failed");
    }
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.card}>
        <h1 style={styles.title}>iPad</h1>
        <p style={styles.subtitle}>Ipad Removal Request System</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>
            Username
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="it"
              style={styles.input}
              autoComplete="username"
            />
          </label>

          <label style={styles.label}>
            Password
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="123"
              type="password"
              style={styles.input}
              autoComplete="current-password"
            />
          </label>

          {err ? <div style={styles.error}>{err}</div> : null}

          <button type="submit" style={styles.button}>
            Login
          </button>
        </form>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    padding: 16,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    border: "1px solid rgba(0,0,0,0.12)",
    borderRadius: 16,
    padding: 20,
  },
  title: { margin: 0, fontSize: 28 },
  subtitle: { marginTop: 8, marginBottom: 16, opacity: 0.7 },
  form: { display: "grid", gap: 12 },
  label: { display: "grid", gap: 6, fontWeight: 600 },
  input: {
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid rgba(0,0,0,0.2)",
    outline: "none",
  },
  error: {
    padding: 10,
    borderRadius: 10,
    border: "1px solid rgba(255,0,0,0.35)",
    background: "rgba(255,0,0,0.06)",
  },
  button: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.2)",
    cursor: "pointer",
    fontWeight: 700,
  },
};
