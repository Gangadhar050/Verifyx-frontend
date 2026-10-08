import { Link } from "react-router-dom";

const logo = "/verify-x-logo.svg";

export default function Navbar() {
  return (
    <header className="topbar">
      <Link className="brand" to="/">
        <img src={logo} alt="Verify-X" className="navbar-logo" />
      </Link>

      <nav>
        <Link className="btn ghost" to="/candidate-login">Candidate Login</Link>
        <Link className="btn primary" to="/admin-login">HR Login</Link>
      </nav>
    </header>
  );
}
