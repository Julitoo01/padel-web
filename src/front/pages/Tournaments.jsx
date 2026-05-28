import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export const Tournaments = () => {
  const navigate = useNavigate();

  const [tournaments, setTournaments] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [selectedBracket, setSelectedBracket] = useState(null);

  const [formData, setFormData] = useState({
    partner_id: "",
  });

  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(false);
  const [bracketLoading, setBracketLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const backendUrl = import.meta.env.VITE_BACKEND_URL || "";

  const getLoggedUser = () => {
    const storedUser = localStorage.getItem("user");

    if (!storedUser) {
      return null;
    }

    return JSON.parse(storedUser);
  };

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
      setUsersLoading(true);

      const response = await fetch(`${backendUrl}/api/users`);

      if (!response.ok) {
        throw new Error("Error al cargar usuarios");
      }

      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error(error);
      setError("No se pudieron cargar los usuarios");
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    getTournaments();
    getUsers();
  }, []);

  const openRegistrationForm = (tournament) => {
    const loggedUser = getLoggedUser();

    if (!loggedUser) {
      setError("Debes iniciar sesión para inscribirte a un torneo");
      navigate("/login");
      return;
    }

    setSelectedTournament(tournament);
    setSelectedBracket(null);
    setMessage("");
    setError("");

    setFormData({
      partner_id: "",
    });
  };

  const closeRegistrationForm = () => {
    setSelectedTournament(null);
    setMessage("");
    setError("");

    setFormData({
      partner_id: "",
    });
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

    const loggedUser = getLoggedUser();

    if (!loggedUser) {
      setError("Debes iniciar sesión para inscribirte a un torneo");
      navigate("/login");
      return;
    }

    if (!selectedTournament) {
      setError("Selecciona un torneo");
      return;
    }

    if (!formData.partner_id) {
      setError("Selecciona una pareja registrada");
      return;
    }

    if (Number(formData.partner_id) === Number(loggedUser.id)) {
      setError("No puedes seleccionarte a ti mismo como pareja");
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
            user_id: loggedUser.id,
            partner_id: Number(formData.partner_id),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al inscribirse al torneo");
      }

      setMessage(data.message || "Pareja inscrita correctamente");
      setSelectedTournament(null);

      setFormData({
        partner_id: "",
      });

      getTournaments();
    } catch (error) {
      console.error(error);
      setError(error.message || "No se pudo realizar la inscripción");
    }
  };

  const getTournamentBracket = async (tournament) => {
    try {
      setBracketLoading(true);
      setError("");
      setMessage("");
      setSelectedTournament(null);

      const response = await fetch(
        `${backendUrl}/api/tournaments/${tournament.id}/bracket`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "No se pudo cargar el cuadro");
      }

      setSelectedBracket(data);
    } catch (error) {
      console.error(error);
      setError(error.message || "No se pudo cargar el cuadro");
    } finally {
      setBracketLoading(false);
    }
  };

  const loggedUser = getLoggedUser();

  const availablePartners = users.filter(
    (user) => loggedUser && Number(user.id) !== Number(loggedUser.id)
  );

  return (
    <div className="container my-5">
      <h1 className="fw-bold mb-3">Torneos</h1>

      <p className="text-muted">
        Consulta los torneos disponibles e inscribe a tu pareja. Los inscritos
        no se mostrarán hasta que se cierren las inscripciones.
      </p>

      {!loggedUser && (
        <div className="alert alert-warning">
          Debes iniciar sesión para poder inscribirte a un torneo.
        </div>
      )}

      {loggedUser && (
        <div className="alert alert-info">
          Jugador principal:{" "}
          <strong>{loggedUser.name || loggedUser.email}</strong>
        </div>
      )}

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
          const registeredPlayers = tournament.registered_players || 0;
          const maxPlayers = tournament.max_players || 0;
          const availablePlaces = maxPlayers - registeredPlayers;
          const isFull = registeredPlayers >= maxPlayers;
          const hasEnoughPlaces = availablePlaces >= 2;
          const isClosed = tournament.status === "closed";
          const canRegister = !isFull && hasEnoughPlaces && !isClosed;

          return (
            <div className="col-md-4" key={tournament.id}>
              <div className="card h-100 shadow-sm">
                <div className="card-body d-flex flex-column">
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
                    <strong>Inscritos:</strong> {registeredPlayers}/{maxPlayers}
                  </p>

                  <p className="mb-1">
                    <strong>Plazas disponibles:</strong>{" "}
                    {availablePlaces > 0 ? availablePlaces : 0}
                  </p>

                  <p className="mb-1">
                    <strong>Precio:</strong> {tournament.price} SAR
                  </p>

                  {tournament.description && (
                    <p className="text-muted mt-2">
                      {tournament.description}
                    </p>
                  )}

                  <p className="mt-auto">
                    <strong>Estado:</strong>{" "}
                    {isClosed ? (
                      <span className="badge bg-secondary">Cerrado</span>
                    ) : isFull ? (
                      <span className="badge bg-danger">Completo</span>
                    ) : !hasEnoughPlaces ? (
                      <span className="badge bg-warning text-dark">
                        Solo queda 1 plaza
                      </span>
                    ) : (
                      <span className="badge bg-success">Abierto</span>
                    )}
                  </p>

                  {isClosed ? (
                    <button
                      className="btn btn-outline-dark w-100"
                      onClick={() => getTournamentBracket(tournament)}
                    >
                      Ver cuadro
                    </button>
                  ) : (
                    <button
                      className="btn btn-success w-100"
                      disabled={!canRegister}
                      onClick={() => openRegistrationForm(tournament)}
                    >
                      {isFull
                        ? "Completo"
                        : !hasEnoughPlaces
                        ? "No hay plazas para pareja"
                        : "Inscribir pareja"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {bracketLoading && <p className="mt-4">Cargando cuadro...</p>}

      {selectedBracket && (
  <div className="card shadow-sm mt-5">
    <div className="card-body">
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <div>
          <h3 className="fw-bold mb-1">
            Cuadro de {selectedBracket.tournament.name}
          </h3>

          <p className="text-muted mb-0">
            Sorteo aleatorio de parejas. Total parejas:{" "}
            {selectedBracket.total_teams}
          </p>
        </div>

        <button
          className="btn btn-outline-secondary btn-sm"
          onClick={() => setSelectedBracket(null)}
        >
          Cerrar
        </button>
      </div>

      {!selectedBracket.rounds || selectedBracket.rounds.length === 0 ? (
        <div className="alert alert-warning">
          No hay cuadro generado para este torneo.
        </div>
      ) : (
        <div
          className="d-flex gap-4 overflow-auto pb-3"
          style={{ alignItems: "flex-start" }}
        >
          {selectedBracket.rounds.map((round, roundIndex) => (
            <div key={roundIndex} style={{ minWidth: "250px" }}>
              <div className="text-center fw-bold mb-3 bg-danger text-white py-2 rounded">
                {round.name}
              </div>

              <div className="d-flex flex-column gap-3">
                {round.matches.map((match, matchIndex) => (
                  <div
                    key={match.match_id || matchIndex}
                    className="border rounded p-2 bg-light shadow-sm"
                  >
                    <div className="small text-muted mb-2">
                      Partido {matchIndex + 1}
                    </div>

                    <div className="border rounded p-2 mb-2 bg-white">
                      {match.team_1 ? (
                        match.team_1.status === "bye" ? (
                          <div className="text-muted">BYE</div>
                        ) : (
                          <>
                            <div>{match.team_1.player_1}</div>
                            <div>{match.team_1.player_2}</div>
                          </>
                        )
                      ) : (
                        <div className="text-muted">Pendiente</div>
                      )}
                    </div>

                    <div className="border rounded p-2 bg-white">
                      {match.team_2 ? (
                        match.team_2.status === "bye" ? (
                          <div className="text-muted">BYE</div>
                        ) : (
                          <>
                            <div>{match.team_2.player_1}</div>
                            <div>{match.team_2.player_2}</div>
                          </>
                        )
                      ) : (
                        <div className="text-muted">Pendiente</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="alert alert-warning mt-4 mb-0">
        Este cuadro es aleatorio y puede cambiar si vuelves a pulsar “Ver cuadro”.
        Luego podemos hacer que se genere una sola vez y quede guardado.
      </div>
    </div>
  </div>
)}

      {selectedTournament && (
        <div className="card shadow-sm mt-5">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
              <div>
                <h3 className="fw-bold mb-1">
                  Inscripción a {selectedTournament.name}
                </h3>

                <p className="text-muted mb-0">
                  Selecciona una pareja que ya esté registrada en la app.
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
                  <label className="form-label">Jugador 1</label>
                  <input
                    type="text"
                    className="form-control"
                    value={loggedUser?.name || loggedUser?.email || ""}
                    disabled
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label">Jugador 2 / Pareja</label>
                  <select
                    className="form-select"
                    name="partner_id"
                    value={formData.partner_id}
                    onChange={handleChange}
                    required
                    disabled={usersLoading}
                  >
                    <option value="">
                      {usersLoading
                        ? "Cargando usuarios..."
                        : "Selecciona una pareja registrada"}
                    </option>

                    {availablePartners.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name || user.email}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-md-4">
                  <label className="form-label">Torneo</label>
                  <input
                    type="text"
                    className="form-control"
                    value={selectedTournament.name}
                    disabled
                  />
                </div>

                <div className="col-md-4">
                  <label className="form-label">Fecha</label>
                  <input
                    type="text"
                    className="form-control"
                    value={selectedTournament.date}
                    disabled
                  />
                </div>

                <div className="col-md-4">
                  <label className="form-label">Precio</label>
                  <input
                    type="text"
                    className="form-control"
                    value={`${selectedTournament.price} SAR`}
                    disabled
                  />
                </div>
              </div>

              <button className="btn btn-success mt-4" type="submit">
                Confirmar inscripción de pareja
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};