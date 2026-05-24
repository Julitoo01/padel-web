import { useEffect, useState } from "react";

export const Classes = () => {
  const [coaches, setCoaches] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedCoach, setSelectedCoach] = useState(null);

  const [formData, setFormData] = useState({
    user_id: "",
    date: "",
    start_time: "",
    end_time: "",
    class_type: "",
    level: "",
    price: "",
  });

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
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
    getCoaches();
    getUsers();
  }, []);

  const openReservationForm = (coach) => {
    setSelectedCoach(coach);
    setMessage("");
    setError("");

    setFormData({
      user_id: "",
      date: "",
      start_time: "",
      end_time: "",
      class_type: "",
      level: "",
      price: coach.price_private || "",
    });
  };

  const closeReservationForm = () => {
    setSelectedCoach(null);
    setMessage("");
    setError("");
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    let updatedFormData = {
      ...formData,
      [name]: value,
    };

    if (name === "class_type" && selectedCoach) {
      if (value === "private") {
        updatedFormData.price = selectedCoach.price_private;
      }

      if (value === "group") {
        updatedFormData.price = selectedCoach.price_group;
      }
    }

    setFormData(updatedFormData);
  };

  const handleReservationSubmit = async (event) => {
    event.preventDefault();

    if (!selectedCoach) {
      setError("Selecciona un entrenador");
      return;
    }

    try {
      setError("");
      setMessage("");

      const response = await fetch(`${backendUrl}/api/class-reservations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: Number(formData.user_id),
          coach_id: selectedCoach.id,
          date: formData.date,
          start_time: formData.start_time,
          end_time: formData.end_time,
          class_type: formData.class_type,
          level: formData.level,
          price: Number(formData.price),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al crear la reserva de clase");
      }

      setMessage("Clase reservada correctamente");
      setSelectedCoach(null);

      setFormData({
        user_id: "",
        date: "",
        start_time: "",
        end_time: "",
        class_type: "",
        level: "",
        price: "",
      });
    } catch (error) {
      console.error(error);
      setError(error.message || "No se pudo reservar la clase");
    }
  };

  return (
    <div className="container my-5">
      <h1 className="fw-bold mb-3">Reservar clase</h1>
      <p className="text-muted">
        Elige un entrenador para reservar una clase de pádel.
      </p>

      {loading && <p>Cargando entrenadores...</p>}

      {message && <div className="alert alert-success">{message}</div>}

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
                  onClick={() => openReservationForm(coach)}
                >
                  Reservar clase
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedCoach && (
        <div className="card shadow-sm mt-5">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div>
                <h3 className="fw-bold mb-1">
                  Reservar clase con {selectedCoach.name}
                </h3>
                <p className="text-muted mb-0">
                  Completa los datos de la clase.
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
                  <label className="form-label">Tipo de clase</label>
                  <select
                    className="form-select"
                    name="class_type"
                    value={formData.class_type}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Selecciona tipo</option>
                    <option value="private">Privada</option>
                    <option value="group">Grupal</option>
                  </select>
                </div>

                <div className="col-md-6">
                  <label className="form-label">Nivel</label>
                  <select
                    className="form-select"
                    name="level"
                    value={formData.level}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Selecciona nivel</option>
                    <option value="Iniciación">Iniciación</option>
                    <option value="Intermedio">Intermedio</option>
                    <option value="Avanzado">Avanzado</option>
                    <option value="Competición">Competición</option>
                  </select>
                </div>

                <div className="col-md-6">
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
                Confirmar clase
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};