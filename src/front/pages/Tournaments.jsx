import { useEffect, useState } from "react";

export const Tournaments = () => {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const backendUrl = import.meta.env.VITE_BACKEND_URL || "";

  const getTournaments = async () => {
    try {
      const response = await fetch(`${backendUrl}/api/tournaments`);

      if (!response.ok) {
        throw new Error("Error al cargar torneos");
      }

      const data = await response.json();
      setTournaments(data);
    } catch (error) {
      console.error(error);
      setError("No se pudieron cargar los torneos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getTournaments();
  }, []);

  return (
    <div className="container my-5">
      <h1 className="fw-bold mb-3">Torneos</h1>
      <p className="text-muted">
        Consulta los torneos disponibles e inscríbete.
      </p>

      {loading && <p>Cargando torneos...</p>}

      {error && <div className="alert alert-danger">{error}</div>}

      {!loading && tournaments.length === 0 && (
        <div className="alert alert-warning">
          Todavía no hay torneos creados.
        </div>
      )}

      <div className="row g-4">
        {tournaments.map((tournament) => (
          <div className="col-md-4" key={tournament.id}>
            <div className="card h-100 shadow-sm">
              <div className="card-body">
                <h5 className="card-title fw-bold">{tournament.name}</h5>

                <p className="mb-1">
                  <strong>Fecha:</strong> {tournament.date}
                </p>

                <p className="mb-1">
                  <strong>Categoría:</strong>{" "}
                  {tournament.category || "No especificada"}
                </p>

                <p className="mb-1">
                  <strong>Nivel:</strong> {tournament.level || "Abierto"}
                </p>

                <p className="mb-1">
                  <strong>Inscritos:</strong>{" "}
                  {tournament.registered_players}/{tournament.max_players}
                </p>

                <p className="mb-1">
                  <strong>Precio:</strong> {tournament.price} €
                </p>

                <p>
                  <strong>Estado:</strong>{" "}
                  <span className="badge bg-success">{tournament.status}</span>
                </p>

                <button className="btn btn-success w-100">
                  Inscribirme
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};