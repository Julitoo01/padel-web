import { useEffect, useState } from "react";

export const Classes = () => {
  const [coaches, setCoaches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const backendUrl = import.meta.env.VITE_BACKEND_URL || "";

  const getCoaches = async () => {
    try {
      const response = await fetch(`${backendUrl}/api/coaches`);

      if (!response.ok) {
        throw new Error("Error al cargar entrenadores");
      }

      const data = await response.json();
      setCoaches(data);
    } catch (error) {
      console.error(error);
      setError("No se pudieron cargar los entrenadores");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getCoaches();
  }, []);

  return (
    <div className="container my-5">
      <h1 className="fw-bold mb-3">Reservar clase</h1>
      <p className="text-muted">
        Elige un entrenador para reservar una clase de pádel.
      </p>

      {loading && <p>Cargando entrenadores...</p>}

      {error && <div className="alert alert-danger">{error}</div>}

      {!loading && coaches.length === 0 && !error && (
        <div className="alert alert-warning">
          Todavía no hay entrenadores creados.
        </div>
      )}

      <div className="row g-4">
        {coaches.map((coach) => (
          <div className="col-md-4" key={coach.id}>
            <div className="card h-100 shadow-sm">
              <div className="card-body">
                <h5 className="card-title fw-bold">{coach.name}</h5>

                <p className="mb-1">
                  <strong>Nivel:</strong> {coach.level || "No especificado"}
                </p>

                <p className="mb-1">
                  <strong>Clase privada:</strong> {coach.price_private} €
                </p>

                <p className="mb-1">
                  <strong>Clase grupal:</strong> {coach.price_group} €
                </p>

                <p className="text-muted">
                  {coach.bio || "Entrenador de pádel disponible."}
                </p>

                <button
                  className="btn btn-success w-100"
                  disabled={!coach.is_active}
                >
                  Reservar clase
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};