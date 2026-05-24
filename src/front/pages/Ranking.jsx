import { useEffect, useState } from "react";

export const Ranking = () => {
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const backendUrl = import.meta.env.VITE_BACKEND_URL || "";

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

  useEffect(() => {
    getRanking();
  }, []);

  return (
    <div className="container my-5">
      <h1 className="fw-bold mb-3">Ranking</h1>
      <p className="text-muted">
        Clasificación general de jugadores.
      </p>

      {loading && <p>Cargando ranking...</p>}

      {error && <div className="alert alert-danger">{error}</div>}

      {!loading && ranking.length === 0 && (
        <div className="alert alert-warning">
          Todavía no hay jugadores en el ranking.
        </div>
      )}

      {ranking.length > 0 && (
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
              </tr>
            </thead>

            <tbody>
              {ranking.map((player, index) => (
                <tr key={player.id}>
                  <td>{index + 1}</td>
                  <td>{player.player || `Usuario ${player.user_id}`}</td>
                  <td>{player.points}</td>
                  <td>{player.matches_played}</td>
                  <td>{player.wins}</td>
                  <td>{player.losses}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};