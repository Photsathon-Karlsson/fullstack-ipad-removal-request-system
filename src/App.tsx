import { useEffect, useState } from "react";
import { getSessionUser, isITUser, logout, type SessionUser } from "./lib/auth";

import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import AccountsPage from "./pages/AccountsPage";
import ActivityLogPage from "./pages/ActivityLogPage";
import FormPage from "./pages/FormPage";

// ✅ ใส่ .tsx ไปเลยกันหาไฟล์ไม่เจอ
import RequestDetailsPage from "./pages/RequestDetailsPage.tsx";

import Header from "./components/Header";
import "./App.css";

export type View = "dashboard" | "accounts" | "activity" | "form" | "details";

export default function App() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [view, setView] = useState<View>("dashboard");
  const [selectedRequestId, setSelectedRequestId] = useState<string>("");

  useEffect(() => {
    const u = getSessionUser();
    if (u && !isITUser(u)) {
      logout();
      setUser(null);
      return;
    }
    setUser(u);
  }, []);

  function handleLogout() {
    logout();
    setUser(null);
    setView("dashboard");
    setSelectedRequestId("");
  }

  // ✅ ใช้ user เป็นตัวตัดสินตรงๆ -> TS ไม่ฟ้อง null แล้ว
  if (!user) {
    return <LoginPage onLoginSuccess={(u) => setUser(u)} />;
  }

  return (
    <div className="app">
      <Header
        roleLabel="IT"
        onLogout={handleLogout}
        onGoDashboard={() => setView("dashboard")}
      />

      {view === "dashboard" && (
        <DashboardPage
          onOpenAccounts={() => setView("accounts")}
          onOpenActivityLog={() => setView("activity")}
          onOpenForm={() => setView("form")}
          onViewRequest={(id) => {
            setSelectedRequestId(id);
            setView("details");
          }}
        />
      )}

      {view === "accounts" && <AccountsPage onBack={() => setView("dashboard")} />}

      {view === "activity" && <ActivityLogPage onBack={() => setView("dashboard")} />}

      {view === "form" && (
        <FormPage
          onBack={() => setView("dashboard")}
          currentUser={user.username}
          onSubmitted={(id) => {
            setSelectedRequestId(id);
            setView("details");
          }}
        />
      )}

      {view === "details" && (
        <RequestDetailsPage
          requestId={selectedRequestId}
          currentUser={user.username}
          onBack={() => setView("dashboard")}
        />
      )}
    </div>
  );
}
