import { useEffect, useState } from "react";

export const Courts = () => {
  const [courts, setCourts] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedCourt, setSelectedCourt] = useState(null);

  const [formData, setFormData] = useState({
    user_id: "",
    date: "",
    start_time: "",
    end_time: "",
    price: "",
  });

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const backendUrl = import.meta.env.VITE_BACKEND_URL || "";

  const getCourts = async () => {
    try {
      const response = await fetch(`${backendUrl}/api/courts`);

      if (!response.ok) {
        throw new Error("Error al cargar las pistas");
      }

      const data = await response.json();
      setCourts(data);
    } catch (error) {
      console.error(error);
      setError("No se pudieron cargar las pistas");
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
    getCourts();
    getUsers();
  }, []);

  const openReservationForm = (court) => {
    setSelectedCourt(court);
    setMessage("");
    setError("");

    setFormData({
      user_id: "",
      date: "",
      start_time: "",
      end_time: "",
      price: court.price_per_hour || "",
    });
  };

  const closeReservationForm = () => {
    setSelectedCourt(null);
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

  const handleReservationSubmit = async (event) => {
    event.preventDefault();

    if (!selectedCourt) {
      setError("Selecciona una pista");
      return;
    }

    try {
      setError("");
      setMessage("");

      const response = await fetch(`${backendUrl}/api/court-reservations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: Number(formData.user_id),
          court_id: selectedCourt.id,
          date: formData.date,
          start_time: formData.start_time,
          end_time: formData.end_time,
          price: Number(formData.price),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al crear la reserva");
      }

      setMessage("Reserva creada correctamente");
      setSelectedCourt(null);

      setFormData({
        user_id: "",
        date: "",
        start_time: "",
        end_time: "",
        price: "",
      });
    } catch (error) {
      console.error(error);
      setError(error.message || "No se pudo crear la reserva");
    }
  };

  return (
    <div className="container my-5">
      <h1 className="fw-bold mb-3">Reservar pista</h1>
      <p className="text-muted">
        Elige una pista disponible para hacer tu reserva.
      </p>

      {loading && <p>Cargando pistas...</p>}

      {message && <div className="alert alert-success">{message}</div>}

      {error && <div className="alert alert-danger">{error}</div>}

      {!loading && courts.length === 0 && !error && (
        <div className="alert alert-warning">
          Todavía no hay pistas creadas.
        </div>
      )}

      <div className="row g-4">
        {courts.map((court) => (
          <div className="col-md-4" key={court.id}>
            <div className="card h-100 shadow-sm">
              <div className="card-body">
                <h5 className="card-title fw-bold">{court.name}</h5>

                <p className="mb-1">
                  <strong>Tipo:</strong>{" "}
                  {court.court_type || "No especificado"}
                </p>

                <p className="mb-1">
                  <strong>Precio:</strong> {court.price_per_hour} €/hora
                </p>

                <p>
                  <strong>Estado:</strong>{" "}
                  {court.is_active ? (
                    <span className="badge bg-success">Disponible</span>
                  ) : (
                    <span className="badge bg-danger">No disponible</span>
                  )}
                </p>

                <button
                  className="btn btn-success w-100"
                  disabled={!court.is_active}
                  onClick={() => openReservationForm(court)}
                >
                  Reservar pista
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedCourt && (
        <div className="card shadow-sm mt-5">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div>
                <h3 className="fw-bold mb-1">
                  Reservar {selectedCourt.name}
                </h3>
                <p className="text-muted mb-0">
                  Completa los datos de la reserva.
                </p>
              </div>

              <button
                className="btn btn-outline-secondary btn-sm"
                onClick={closeReservationForm}
              >
                Cerrar
              </button>
            </div>

            <form onSubmit={handleReservationSubmit}>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label">Usuario</label>
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
                  <label className="form-label">Fecha</label>
                  <input
                    type="date"
                    className="form-control"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="col-md-4">
                  <label className="form-label">Hora inicio</label>
                  <input
                    type="time"
                    className="form-control"
                    name="start_time"
                    value={formData.start_time}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="col-md-4">
                  <label className="form-label">Hora fin</label>
                  <input
                    type="time"
                    className="form-control"
                    name="end_time"
                    value={formData.end_time}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="col-md-4">
                  <label className="form-label">Precio</label>
                  <input
                    type="number"
                    className="form-control"
                    name="price"
                    value={formData.price}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <button className="btn btn-success mt-4" type="submit">
                Confirmar reserva
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};