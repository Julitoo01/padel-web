import { Link } from "react-router-dom";

export const Home = () => {
  const clubLocationUrl =
    import.meta.env.VITE_CLUB_LOCATION_URL || "https://www.google.com/maps";

  return (
    <div>
      <section className="bg-light py-5">
        <div className="container text-center">
          <h1 className="display-4 fw-bold">
            Gestiona tu club de pádel fácilmente
          </h1>

          <p className="lead mt-3">
            Reserva pistas, organiza torneos, consulta rankings y reserva clases
            desde una sola plataforma.
          </p>

          <div className="d-flex justify-content-center gap-3 mt-4 flex-wrap">
            <Link to="/courts" className="btn btn-success btn-lg">
              Reservar pista
            </Link>

            <Link to="/classes" className="btn btn-outline-success btn-lg">
              Reservar clase
            </Link>

            <a
              href={clubLocationUrl}
              target="_blank"
              rel="noreferrer"
              className="btn btn-outline-dark btn-lg"
            >
              Ver ubicación del club
            </a>
          </div>
        </div>
      </section>

      <section className="container my-5">
        <h2 className="text-center mb-4">¿Qué puedes hacer?</h2>

        <div className="row g-4">
          <div className="col-md-3">
            <div className="card h-100 shadow-sm">
              <div className="card-body text-center">
                <h5 className="card-title">Reservar pista</h5>
                <p className="card-text">
                  Elige día, hora y pista disponible para jugar.
                </p>
                <Link to="/courts" className="btn btn-success btn-sm">
                  Ver pistas
                </Link>
              </div>
            </div>
          </div>

          <div className="col-md-3">
            <div className="card h-100 shadow-sm">
              <div className="card-body text-center">
                <h5 className="card-title">Clases</h5>
                <p className="card-text">
                  Reserva clases particulares o grupales con entrenadores.
                </p>
                <Link to="/classes" className="btn btn-success btn-sm">
                  Ver clases
                </Link>
              </div>
            </div>
          </div>

          <div className="col-md-3">
            <div className="card h-100 shadow-sm">
              <div className="card-body text-center">
                <h5 className="card-title">Torneos</h5>
                <p className="card-text">
                  Apúntate a torneos americanos, ligas o eliminatorias.
                </p>
                <Link to="/tournaments" className="btn btn-success btn-sm">
                  Ver torneos
                </Link>
              </div>
            </div>
          </div>

          <div className="col-md-3">
            <div className="card h-100 shadow-sm">
              <div className="card-body text-center">
                <h5 className="card-title">Ranking</h5>
                <p className="card-text">
                  Consulta la clasificación de jugadores por puntos.
                </p>
                <Link to="/ranking" className="btn btn-success btn-sm">
                  Ver ranking
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container my-5">
        <div className="bg-success text-white rounded p-5 text-center">
          <h2>Próximo torneo americano</h2>
          <p className="mb-3">
            Apúntate a los próximos torneos del club y compite con otros
            jugadores.
          </p>
          <Link to="/tournaments" className="btn btn-light">
            Ver torneos
          </Link>
        </div>
      </section>

      <section className="container my-5">
        <div className="row align-items-center g-4">
          <div className="col-md-6">
            <h2 className="fw-bold">Ubicación del club</h2>
            <p className="text-muted">
              Encuentra fácilmente el club en Google Maps y calcula la mejor
              ruta para llegar.
            </p>

            <p className="mb-3">
              <strong>Dirección:</strong> Padel Pals, Abhur Al Junoobiyah,
              Jeddah 23734, Arabia Saudí
            </p>

            <a
              href={clubLocationUrl}
              target="_blank"
              rel="noreferrer"
              className="btn btn-success"
            >
              Abrir en Google Maps
            </a>
          </div>

          <div className="col-md-6">
            <div className="card shadow-sm">
              <div className="card-body text-center">
                <h5 className="card-title">Padel Pals</h5>
                <p className="card-text">
                  Padel Pals, Abhur Al Junoobiyah, Jeddah 23734, Arabia Saudí
                </p>

                <a
                  href={clubLocationUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-outline-success"
                >
                  Ver ubicación
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};