import { NavLink, useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
const logo = "/verify-x-logo.svg";

export default function Sidebar({ type }) {
  const { session, logout } = useAuth();
  const nav = useNavigate();
  const role = type || session?.type;

  const admin = [
    ["/dashboard", "📊 Dashboard"],
    ["/reports", "📈 Reports"],
    ["/profile", "🙍 Profile"],
  ];

  const cand = [
    ["/candidate", "🏠 My Portal"],
    ["/candidate-documents", "📤 Upload Documents"],
    ["/profile", "🙍 Profile"],
  ];

  const isCandidate = role === "CANDIDATE";
  const links = isCandidate ? cand : admin;
  const footerName = isCandidate ? (session?.name || "Candidate") : (session?.name || "HR");
  const footerRole = isCandidate ? "CANDIDATE" : "HR";

  return (
    <aside className="sidebar">
      <div className="side-logo">
        <img src={logo} alt="Verify-X" className="sidebar-logo" />
      </div>

      {links.map(([to, label]) => (
        <NavLink key={to} to={to}>
          {label}
        </NavLink>
      ))}

      <div className="side-footer">
        <small>{footerName} • {footerRole}</small>
        <button
          className="btn full"
          onClick={() => {
            logout();
            nav(isCandidate ? "/candidate-login" : "/admin-login");
          }}
        >
          Logout
        </button>
      </div>
    </aside>
  );
}
