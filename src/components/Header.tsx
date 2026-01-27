type Props = {
  roleLabel: string; // "IT"
  onLogout: () => void;
  onGoDashboard: () => void;
};

export default function Header({ roleLabel, onLogout, onGoDashboard }: Props) {
  return (
    <header className="topbar">
      <div className="topbar__left" onClick={onGoDashboard} role="button" tabIndex={0}>
        <div className="logoCircle">IRRS</div>
        <div className="brand">
          <div className="brand__title">iPad Removal Request System</div>
          <div className="brand__sub">
            A web system for submitting and managing student iPad removal requests.
          </div>
        </div>
      </div>

      <div className="topbar__right">
        <span className="pill">{roleLabel}</span>
        <button className="btn btn--dark" onClick={onLogout}>
          Logout
        </button>
      </div>
    </header>
  );
}
