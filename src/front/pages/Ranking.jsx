import { useEffect, useState } from "react";

export const Ranking = () => {
  const [ranking, setRanking] = useState([]);
  const [users, setUsers] = useState([]);

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
  const [usersLoading, setUsersLoading] = useState(false);
  const [showMatchForm, setShowMatchForm] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const backendUrl = import.meta.env.VITE_BACKEND_URL || "";

  const storedUser = localStorage.getItem("user");
  const loggedUser = storedUser ? JSON.parse(storedUser) : null;

  const getRanking = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${backendUrl}/api/ranking`);

      if (!response.ok) {
        throw new Error("No se pudo cargar el ranking");
      }

      const data = await response.json();
      setRanking(data);
    } catch (error) {
      console.error(error);
      setError(error.message || "No se pudo cargar el ranking");
    } finally {
      setLoading(false);
    }
  };

  const getUsers = async () => {
    try {
      setUsersLoading(true);

      const response = await fetch(`${backendUrl}/api/users`);

      if (!response.ok) {
        throw new Error("No se pudieron cargar los usuarios");
      }

      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error(error);
      setError(error.message || "No se pudieron cargar los usuarios");
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    getRanking();
    getUsers();
  }, []);

  const handleMatchFormChange = (event) => {
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

  const handleSubmitMatchResult = async (event) => {
    event.preventDefault();

    if (!loggedUser) {
      setError("Debes iniciar sesión para subir un resultado");
      return;
    }

    const playerIds = [
      matchForm.team1_drive_id,
      matchForm.team1_left_id,
      matchForm.team2_drive_id,
      matchForm.team2_left_id,
    ];

    if (playerIds.some((id) => !id)) {
      setError("Selecciona los 4 jugadores del partido");
      return;
    }

    if (new Set(playerIds).size !== 4) {
      setError("No puedes repetir jugadores en el mismo partido");
      return;
    }

    if (!playerIds.includes(String(loggedUser.id))) {
      setError("Solo puedes subir resultados de partidos en los que participas");
      return;
    }

    if (
      matchForm.set1_team1 === "" ||
      matchForm.set1_team2 === "" ||
      matchForm.set2_team1 === "" ||
      matchForm.set2_team2 === ""
    ) {
      setError("Rellena los resultados del Set 1 y Set 2");
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
          submitted_by: loggedUser.id,
          team1_drive_id: Number(matchForm.team1_drive_id),
          team1_left_id: Number(matchForm.team1_left_id),
          team2_drive_id: Number(matchForm.team2_drive_id),
          team2_left_id: Number(matchForm.team2_left_id),
          set1_team1: Number(matchForm.set1_team1),
          set1_team2: Number(matchForm.set1_team2),
          set2_team1: Number(matchForm.set2_team1),
          set2_team2: Number(matchForm.set2_team2),
          set3_team1:
            matchForm.set3_team1 === "" ? null : Number(matchForm.set3_team1),
          set3_team2:
            matchForm.set3_team2 === "" ? null : Number(matchForm.set3_team2),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "No se pudo subir el resultado");
      }

      setMessage("Resultado subido correctamente");
      resetMatchForm();
      setShowMatchForm(false);
      getRanking();
    } catch (error) {
      console.error(error);
      setError(error.message || "No se pudo subir el resultado");
    }
  };

  const handleResetRanking = async () => {
    if (!loggedUser) {
      setError("Debes iniciar sesión");
      return;
    }

    if (loggedUser.role !== "admin") {
      setError("Solo el admin puede resetear el ranking");
      return;
    }

    const confirmReset = window.confirm(
      "¿Seguro que quieres resetear todo el ranking? Se borrarán partidos, victorias, derrotas y puntos."
    );

    if (!confirmReset) {
      return;
    }

    try {
      setError("");
      setMessage("");

      const response = await fetch(`${backendUrl}/api/ranking/reset`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          admin_id: loggedUser.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "No se pudo resetear el ranking");
      }

      setMessage("Ranking reseteado correctamente");
      getRanking();
    } catch (error) {
      console.error(error);
      setError(error.message || "No se pudo resetear el ranking");
    }
  };

  let eligiblePosition = 0;

  const rankingWithPositions = ranking.map((player) => {
    if (player.is_eligible) {
      eligiblePosition += 1;

      return {
        ...player,
        position: eligiblePosition,
      };
    }

    return {
      ...player,
      position: null,
    };
  });

  return (
    <div className="container my-5">
      <div className="d-flex justify-content-between align-items-start flex-wrap gap-3 mb-4">
        <div>
          <h1 className="fw-bold mb-2">Ranking</h1>

          <p className="text-muted mb-0">
            Clasificación general según porcentaje de victorias. Para entrar en
            ranking oficial necesitas mínimo 5 partidos jugados.
          </p>
        </div>

        {loggedUser?.role === "admin" && (
          <button
            className="btn btn-outline-danger"
            onClick={handleResetRanking}
          >
            Resetear ranking
          </button>
        )}
      </div>

      {loggedUser && (
        <div className="alert alert-info">
          Estás viendo el ranking como:{" "}
          <strong>{loggedUser.name || loggedUser.email}</strong>
          {loggedUser.role === "admin" && (
            <span className="badge bg-dark ms-2">Admin</span>
          )}
        </div>
      )}

      {!loggedUser && (
        <div className="alert alert-warning">
          Debes iniciar sesión para subir resultados del ranking.
        </div>
      )}

      {message && <div className="alert alert-success">{message}</div>}

      {error && <div className="alert alert-danger">{error}</div>}

      {loggedUser && (
        <div className="mb-5">
          <button
            className={
              showMatchForm
                ? "btn btn-outline-secondary mb-3"
                : "btn btn-success mb-3"
            }
            onClick={() => {
              setShowMatchForm(!showMatchForm);
              setError("");
              setMessage("");
            }}
          >
            {showMatchForm ? "Cerrar formulario" : "Subir resultado"}
          </button>

          {showMatchForm && (
            <div className="card shadow-sm">
              <div className="card-body">
                <h3 className="fw-bold mb-3">Subir resultado de ranking</h3>

                <p className="text-muted">
                  Solo puedes subir resultados de partidos en los que tú
                  participas. El ranking se calcula por porcentaje de victorias.
                </p>

                <form onSubmit={handleSubmitMatchResult}>
                  <div className="row g-3">
                    <div className="col-12">
                      <h5 className="fw-bold">Equipo 1</h5>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Drive player</label>
                      <select
                        className="form-select"
                        name="team1_drive_id"
                        value={matchForm.team1_drive_id}
                        onChange={handleMatchFormChange}
                        required
                        disabled={usersLoading}
                      >
                        <option value="">Selecciona jugador</option>
                        {users.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.name || user.email}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Left player</label>
                      <select
                        className="form-select"
                        name="team1_left_id"
                        value={matchForm.team1_left_id}
                        onChange={handleMatchFormChange}
                        required
                        disabled={usersLoading}
                      >
                        <option value="">Selecciona jugador</option>
                        {users.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.name || user.email}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-12 mt-4">
                      <h5 className="fw-bold">Equipo 2</h5>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Drive player</label>
                      <select
                        className="form-select"
                        name="team2_drive_id"
                        value={matchForm.team2_drive_id}
                        onChange={handleMatchFormChange}
                        required
                        disabled={usersLoading}
                      >
                        <option value="">Selecciona jugador</option>
                        {users.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.name || user.email}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Left player</label>
                      <select
                        className="form-select"
                        name="team2_left_id"
                        value={matchForm.team2_left_id}
                        onChange={handleMatchFormChange}
                        required
                        disabled={usersLoading}
                      >
                        <option value="">Selecciona jugador</option>
                        {users.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.name || user.email}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-12 mt-4">
                      <h5 className="fw-bold">Resultado</h5>
                    </div>

                    <div className="col-md-4">
                      <label className="form-label">Set 1 - Equipo 1</label>
                      <input
                        type="number"
                        className="form-control"
                        name="set1_team1"
                        min="0"
                        value={matchForm.set1_team1}
                        onChange={handleMatchFormChange}
                        required
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label">Set 1 - Equipo 2</label>
                      <input
                        type="number"
                        className="form-control"
                        name="set1_team2"
                        min="0"
                        value={matchForm.set1_team2}
                        onChange={handleMatchFormChange}
                        required
                      />
                    </div>

                    <div className="col-md-4"></div>

                    <div className="col-md-4">
                      <label className="form-label">Set 2 - Equipo 1</label>
                      <input
                        type="number"
                        className="form-control"
                        name="set2_team1"
                        min="0"
                        value={matchForm.set2_team1}
                        onChange={handleMatchFormChange}
                        required
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label">Set 2 - Equipo 2</label>
                      <input
                        type="number"
                        className="form-control"
                        name="set2_team2"
                        min="0"
                        value={matchForm.set2_team2}
                        onChange={handleMatchFormChange}
                        required
                      />
                    </div>

                    <div className="col-md-4"></div>

                    <div className="col-md-4">
                      <label className="form-label">Set 3 - Equipo 1</label>
                      <input
                        type="number"
                        className="form-control"
                        name="set3_team1"
                        min="0"
                        value={matchForm.set3_team1}
                        onChange={handleMatchFormChange}
                        placeholder="Opcional"
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label">Set 3 - Equipo 2</label>
                      <input
                        type="number"
                        className="form-control"
                        name="set3_team2"
                        min="0"
                        value={matchForm.set3_team2}
                        onChange={handleMatchFormChange}
                        placeholder="Opcional"
                      />
                    </div>
                  </div>

                  <button className="btn btn-success mt-4" type="submit">
                    Confirmar resultado
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {loading && <p>Cargando ranking...</p>}

      {!loading && ranking.length === 0 && !error && (
        <div className="alert alert-warning">
          Todavía no hay jugadores en el ranking.
        </div>
      )}

      {!loading && ranking.length > 0 && (
        <div className="card shadow-sm">
          <div className="table-responsive">
            <table className="table table-striped table-hover align-middle mb-0">
              <thead className="table-success">
                <tr>
                  <th>Posición</th>
                  <th>Jugador</th>
                  <th>Partidos</th>
                  <th>Victorias</th>
                  <th>Derrotas</th>
                  <th>Ratio victorias</th>
                  <th>Estado</th>
                </tr>
              </thead>

              <tbody>
                {rankingWithPositions.map((player) => {
                  const isCurrentUser =
                    loggedUser &&
                    Number(loggedUser.id) === Number(player.user_id);

                  return (
                    <tr
                      key={player.id}
                      className={isCurrentUser ? "table-warning fw-bold" : ""}
                    >
                      <td>
                        {player.is_eligible ? (
                          <>
                            {player.position === 1 && "🥇"}
                            {player.position === 2 && "🥈"}
                            {player.position === 3 && "🥉"}
                            {player.position > 3 && player.position}
                          </>
                        ) : (
                          "-"
                        )}
                      </td>

                      <td>
                        {player.player}
                        {isCurrentUser && (
                          <span className="badge bg-warning text-dark ms-2">
                            Tú
                          </span>
                        )}
                      </td>

                      <td>{player.matches_played}</td>

                      <td>{player.wins}</td>

                      <td>{player.losses}</td>

                      <td>
                        {player.matches_played > 0
                          ? `${player.win_ratio}%`
                          : "0%"}
                      </td>

                      <td>
                        {player.is_eligible ? (
                          <span className="badge bg-success">
                            Clasificado
                          </span>
                        ) : (
                          <span className="badge bg-warning text-dark">
                            Necesita 5 partidos
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};