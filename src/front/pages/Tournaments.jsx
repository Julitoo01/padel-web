import { useEffect, useState } from "react";

export const Tournaments = () => {
  const [tournaments, setTournaments] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState(null);

  const [formData, setFormData] = useState({
    user_id: "",
    partner_name: "",
  });

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
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

  const getUsers = async () => {
    try {
      const response = await fetch(`${backendUrl}/api/users`);

      if (!response.ok) {
        throw new Error("Error al cargar usuarios");
      }

      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error(error);
      setError("No se pudieron cargar los usuarios");
    }
  };

  useEffect(() => {
    getTournaments();
    getUsers();
  }, []);

  const openRegistrationForm = (tournament) => {
    setSelectedTournament(tournament);
    setMessage("");
    setError("");

    setFormData({
      user_id: "",
      partner_name: "",
    });
  };

  const closeRegistrationForm = () => {
    setSelectedTournament(null);
    setMessage("");
    setError("");
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleTournamentRegistration = async (event) => {
    event.preventDefault();

    if (!selectedTournament) {
      setError("Selecciona un torneo");
      return;
    }

    try {
      setError("");
      setMessage("");

      const response = await fetch(
        `${backendUrl}/api/tournaments/${selectedTournament.id}/join`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: Number(formData.user_id),
            partner_name: formData.partner_name,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al inscribirse al torneo");
      }

      setMessage("Inscripción realizada correctamente");
      setSelectedTournament(null);

      setFormData({
        user_id: "",
        partner_name: "",
      });

      getTournaments();
    } catch (error) {
      console.error(error);
      setError(error.message || "No se pudo realizar la inscripción");
    }
  };

  return (
    <div className="container my-5">
      <h1 className="fw-bold mb-3">Torneos</h1>
      <p className="text-muted">
        Consulta los torneos disponibles e inscríbete.
      </p>

      {loading && <p>Cargando torneos...</p>}

      {message && <div className="alert alert-success">{message}</div>}

      {error && <div className="alert alert-danger">{error}</div>}

      {!loading && tournaments.length === 0 && !error && (
        <div className="alert alert-warning">
          Todavía no hay torneos creados.
        </div>
      )}

      <div className="row g-4">
        {tournaments.map((tournament) => {
          const isFull =
            tournament.registered_players >= tournament.max_players;

          return (
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
                    {isFull ? (
                      <span className="badge bg-danger">Completo</span>
                    ) : (
                      <span className="badge bg-success">
                        {tournament.status}
                      </span>
                    )}
                  </p>

                  <button
                    className="btn btn-success w-100"
                    disabled={isFull}
                    onClick={() => openRegistrationForm(tournament)}
                  >
                    {isFull ? "Completo" : "Inscribirme"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {selectedTournament && (
        <div className="card shadow-sm mt-5">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div>
                <h3 className="fw-bold mb-1">
                  Inscripción a {selectedTournament.name}
                </h3>
                <p className="text-muted mb-0">
                  Selecciona el jugador y escribe el nombre de la pareja.
                </p>
              </div>

              <button
                className="btn btn-outline-secondary btn-sm"
                onClick={closeRegistrationForm}
              >
                Cerrar
              </button>
            </div>

            <form onSubmit={handleTournamentRegistration}>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label">Jugador</label>
                  <select
                    className="form-select"
                    name="user_id"
                    value={formData.user_id}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Selecciona un usuario</option>

                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name || user.email}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-md-6">
                  <label className="form-label">Pareja</label>
                  <input
                    type="text"
                    className="form-control"
                    name="partner_name"
                    placeholder="Ej: Carlos"
                    value={formData.partner_name}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <button className="btn btn-success mt-4" type="submit">
                Confirmar inscripción
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};