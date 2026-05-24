import { Link } from "react-router-dom";

export const Navbar = () => {
  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-success px-4">
      <Link className="navbar-brand fw-bold" to="/">
        PadelWeb
      </Link>

      <button
        className="navbar-toggler"
        type="button"
        data-bs-toggle="collapse"
        data-bs-target="#navbarNav"
      >
        <span className="navbar-toggler-icon"></span>
      </button>

      <div className="collapse navbar-collapse" id="navbarNav">
        <ul className="navbar-nav ms-auto gap-2">
          <li className="nav-item">
            <Link className="nav-link" to="/courts">
              Reservar pista
            </Link>
          </li>

          <li className="nav-item">
            <Link className="nav-link" to="/classes">
              Reservar clase
            </Link>
          </li>

          <li className="nav-item">
            <Link className="nav-link" to="/tournaments">
              Torneos
            </Link>
          </li>

          <li className="nav-item">
            <Link className="nav-link" to="/ranking">
              Ranking
            </Link>
          </li>

          <li className="nav-item">
            <Link className="btn btn-light btn-sm" to="/login">
              Login
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  );
};