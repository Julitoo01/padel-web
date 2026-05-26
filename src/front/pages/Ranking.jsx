import { useEffect, useState } from "react";

export const Ranking = () => {
  const [ranking, setRanking] = useState([]);
  const [users, setUsers] = useState([]);

  const [showMatchForm, setShowMatchForm] = useState(false);

  const [matchForm, setMatchForm] = useState({
    team1_drive_id: "",
    team1_left_id: "",
    team2_drive_id: "",
    team2_left_id: "",
    set1_team1: "",
    set1_team2: "",
    set2_team1: "",
    set2_team2: "",
    set3_team1: "",
    set3_team2: "",
  });

  const [loading, setLoading] = useState(true);
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

  const getRanking = async () => {
    try {
      const response = await fetch(`${backendUrl}/api/ranking`);

      if (!response.ok) {
        throw new Error("Error al cargar ranking");
      }

      const data = await response.json();
      setRanking(data);
    } catch (error) {
      console.error(error);
      setError("No se pudo cargar el ranking");
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
    getRanking();
    getUsers();
  }, []);

  const loggedUser = getLoggedUser();

  const getPositionBadge = (position) => {
    if (position === 1) return "🥇";
    if (position === 2) return "🥈";
    if (position === 3) return "🥉";
    return position;
  };

  const handleMatchChange = (event) => {
    const { name, value } = event.target;

    setMatchForm({
      ...matchForm,
      [name]: value,
    });
  };

  const resetMatchForm = () => {
    setMatchForm({
      team1_drive_id: "",
      team1_left_id: "",
      team2_drive_id: "",
      team2_left_id: "",
      set1_team1: "",
      set1_team2: "",
      set2_team1: "",
      set2_team2: "",
      set3_team1: "",
      set3_team2: "",
    });
  };

  const handleSubmitMatch = async (event) => {
    event.preventDefault();

    if (!loggedUser) {
      setError("Debes iniciar sesión para subir un resultado");
      return;
    }

    try {
      setError("");
      setMessage("");

      const response = await fetch(`${backendUrl}/api/matches/result`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          team1_drive_id: Number(matchForm.team1_drive_id),
          team1_left_id: Number(matchForm.team1_left_id),
          team2_drive_id: Number(matchForm.team2_drive_id),
          team2_left_id: Number(matchForm.team2_left_id),
          set1_team1: Number(matchForm.set1_team1),
          set1_team2: Number(matchForm.set1_team2),
          set2_team1: Number(matchForm.set2_team1),
          set2_team2: Number(matchForm.set2_team2),
          set3_team1:
            matchForm.set3_team1 === "" ? "" : Number(matchForm.set3_team1),
          set3_team2:
            matchForm.set3_team2 === "" ? "" : Number(matchForm.set3_team2),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al subir el resultado");
      }

      setMessage(`${data.message}. Ganador: ${data.winner_team}`);
      resetMatchForm();
      setShowMatchForm(false);
      getRanking();
    } catch (error) {
      console.error(error);
      setError(error.message || "No se pudo subir el resultado");
    }
  };

  const renderUserOptions = () => {
    return users.map((user) => (
      <option key={user.id} value={user.id}>
        {user.name || user.email}
      </option>
    ));
  };

  return (
    <div className="container my-5">
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-3">
        <div>
          <h1 className="fw-bold mb-2">Ranking</h1>

          <p className="text-muted mb-0">
            Clasificación general de jugadores según puntos, partidos,
            victorias y derrotas.
          </p>
        </div>

        <button
          className="btn btn-success"
          onClick={() => setShowMatchForm(!showMatchForm)}
        >
          {showMatchForm ? "Cerrar resultado" : "Subir resultado"}
        </button>
      </div>

      {loggedUser && (
        <div className="alert alert-info">
          Estás viendo el ranking como:{" "}
          <strong>{loggedUser.name || loggedUser.email}</strong>
        </div>
      )}

      {!loggedUser && (
        <div className="alert alert-warning">
          Debes iniciar sesión para subir resultados.
        </div>
      )}

      {message && <div className="alert alert-success">{message}</div>}

      {error && <div className="alert alert-danger">{error}</div>}

      {showMatchForm && (
        <div className="card shadow-sm mb-4">
          <div className="card-body">
            <h3 className="fw-bold mb-3">Subir resultado del partido</h3>

            <form onSubmit={handleSubmitMatch}>
              <div className="row g-4">
                <div className="col-md-6">
                  <div className="border rounded p-3 h-100">
                    <h5 className="fw-bold mb-3">Equipo 1</h5>

                    <div className="mb-3">
                      <label className="form-label">Drive Player</label>
                      <select
                        className="form-select"
                        name="team1_drive_id"
                        value={matchForm.team1_drive_id}
                        onChange={handleMatchChange}
                        required
                      >
                        <option value="">Selecciona jugador</option>
                        {renderUserOptions()}
                      </select>
                    </div>

                    <div className="mb-3">
                      <label className="form-label">Left Player</label>
                      <select
                        className="form-select"
                        name="team1_left_id"
                        value={matchForm.team1_left_id}
                        onChange={handleMatchChange}
                        required
                      >
                        <option value="">Selecciona jugador</option>
                        {renderUserOptions()}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="col-md-6">
                  <div className="border rounded p-3 h-100">
                    <h5 className="fw-bold mb-3">Equipo 2</h5>

                    <div className="mb-3">
                      <label className="form-label">Drive Player</label>
                      <select
                        className="form-select"
                        name="team2_drive_id"
                        value={matchForm.team2_drive_id}
                        onChange={handleMatchChange}
                        required
                      >
                        <option value="">Selecciona jugador</option>
                        {renderUserOptions()}
                      </select>
                    </div>

                    <div className="mb-3">
                      <label className="form-label">Left Player</label>
                      <select
                        className="form-select"
                        name="team2_left_id"
                        value={matchForm.team2_left_id}
                        onChange={handleMatchChange}
                        required
                      >
                        <option value="">Selecciona jugador</option>
                        {renderUserOptions()}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="col-12">
                  <div className="border rounded p-3">
                    <h5 className="fw-bold mb-3">Resultado</h5>

                    <div className="row g-3">
                      <div className="col-md-4">
                        <label className="form-label">Set 1 - Equipo 1</label>
                        <input
                          type="number"
                          className="form-control"
                          name="set1_team1"
                          value={matchForm.set1_team1}
                          onChange={handleMatchChange}
                          min="0"
                          required
                        />
                      </div>

                      <div className="col-md-4">
                        <label className="form-label">Set 1 - Equipo 2</label>
                        <input
                          type="number"
                          className="form-control"
                          name="set1_team2"
                          value={matchForm.set1_team2}
                          onChange={handleMatchChange}
                          min="0"
                          required
                        />
                      </div>

                      <div className="col-md-4">
                        <label className="form-label">Ganador Set 1</label>
                        <input
                          type="text"
                          className="form-control"
                          value={
                            matchForm.set1_team1 === "" ||
                            matchForm.set1_team2 === ""
                              ? "Pendiente"
                              : Number(matchForm.set1_team1) >
                                Number(matchForm.set1_team2)
                              ? "Equipo 1"
                              : Number(matchForm.set1_team2) >
                                Number(matchForm.set1_team1)
                              ? "Equipo 2"
                              : "Empate no válido"
                          }
                          disabled
                        />
                      </div>

                      <div className="col-md-4">
                        <label className="form-label">Set 2 - Equipo 1</label>
                        <input
                          type="number"
                          className="form-control"
                          name="set2_team1"
                          value={matchForm.set2_team1}
                          onChange={handleMatchChange}
                          min="0"
                          required
                        />
                      </div>

                      <div className="col-md-4">
                        <label className="form-label">Set 2 - Equipo 2</label>
                        <input
                          type="number"
                          className="form-control"
                          name="set2_team2"
                          value={matchForm.set2_team2}
                          onChange={handleMatchChange}
                          min="0"
                          required
                        />
                      </div>

                      <div className="col-md-4">
                        <label className="form-label">Ganador Set 2</label>
                        <input
                          type="text"
                          className="form-control"
                          value={
                            matchForm.set2_team1 === "" ||
                            matchForm.set2_team2 === ""
                              ? "Pendiente"
                              : Number(matchForm.set2_team1) >
                                Number(matchForm.set2_team2)
                              ? "Equipo 1"
                              : Number(matchForm.set2_team2) >
                                Number(matchForm.set2_team1)
                              ? "Equipo 2"
                              : "Empate no válido"
                          }
                          disabled
                        />
                      </div>

                      <div className="col-md-6">
                        <label className="form-label">
                          Set 3 - Equipo 1 opcional
                        </label>
                        <input
                          type="number"
                          className="form-control"
                          name="set3_team1"
                          value={matchForm.set3_team1}
                          onChange={handleMatchChange}
                          min="0"
                        />
                      </div>

                      <div className="col-md-6">
                        <label className="form-label">
                          Set 3 - Equipo 2 opcional
                        </label>
                        <input
                          type="number"
                          className="form-control"
                          name="set3_team2"
                          value={matchForm.set3_team2}
                          onChange={handleMatchChange}
                          min="0"
                        />
                      </div>
                    </div>

                    <small className="text-muted d-block mt-3">
                      Si un equipo gana Set 1 y Set 2, no hace falta Set 3. Si
                      cada equipo gana un set, el Set 3 será obligatorio.
                    </small>
                  </div>
                </div>
              </div>

              <button className="btn btn-success mt-4" type="submit">
                Guardar resultado
              </button>
            </form>
          </div>
        </div>
      )}

      {loading && <p>Cargando ranking...</p>}

      {!loading && ranking.length === 0 && !error && (
        <div className="alert alert-warning">
          Todavía no hay jugadores en el ranking.
        </div>
      )}

      {ranking.length > 0 && (
        <div className="card shadow-sm">
          <div className="card-body">
            <div className="table-responsive">
              <table className="table table-striped table-hover align-middle">
                <thead className="table-success">
                  <tr>
                    <th>Posición</th>
                    <th>Jugador</th>
                    <th>Puntos</th>
                    <th>Partidos</th>
                    <th>Victorias</th>
                    <th>Derrotas</th>
                    <th>Ratio victorias</th>
                  </tr>
                </thead>

                <tbody>
                  {ranking.map((player, index) => {
                    const position = index + 1;
                    const isLoggedUser =
                      loggedUser && loggedUser.id === player.user_id;

                    const winRate =
                      player.matches_played > 0
                        ? Math.round(
                            (player.wins / player.matches_played) * 100
                          )
                        : 0;

                    return (
                      <tr
                        key={player.id}
                        className={isLoggedUser ? "table-warning fw-bold" : ""}
                      >
                        <td>{getPositionBadge(position)}</td>

                        <td>
                          {player.player || `Usuario ${player.user_id}`}
                          {isLoggedUser && (
                            <span className="badge bg-warning text-dark ms-2">
                              Tú
                            </span>
                          )}
                        </td>

                        <td>
                          <strong>{player.points}</strong>
                        </td>

                        <td>{player.matches_played}</td>
                        <td>{player.wins}</td>
                        <td>{player.losses}</td>
                        <td>{winRate}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};