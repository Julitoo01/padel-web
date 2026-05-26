import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

export const Navbar = () => {
  const navigate = useNavigate();

  const clubLocationUrl =
    import.meta.env.VITE_CLUB_LOCATION_URL || "https://www.google.com/maps";

  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");

    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    navigate("/login");
  };

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
        <ul className="navbar-nav ms-auto gap-2 align-items-lg-center">
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
            <a
              className="btn btn-outline-light btn-sm"
              href={clubLocationUrl}
              target="_blank"
              rel="noreferrer"
            >
              Ubicación
            </a>
          </li>

          {user ? (
            <>
              <li className="nav-item">
                <span className="navbar-text text-white">
                  Hola, {user.name || user.email}
                </span>
              </li>

              <li className="nav-item">
                <button
                  className="btn btn-light btn-sm"
                  type="button"
                  onClick={handleLogout}
                >
                  Logout
                </button>
              </li>
            </>
          ) : (
            <>
              <li className="nav-item">
                <Link className="btn btn-outline-light btn-sm" to="/register">
                  Registro
                </Link>
              </li>

              <li className="nav-item">
                <Link className="btn btn-light btn-sm" to="/login">
                  Login
                </Link>
              </li>
            </>
          )}
        </ul>
      </div>
    </nav>
  );
};