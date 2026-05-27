import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const CLASS_PRICE = 360;

const getMonday = (date) => {
  const copiedDate = new Date(date);
  const day = copiedDate.getDay();
  const diff = copiedDate.getDate() - day + (day === 0 ? -6 : 1);
  copiedDate.setDate(diff);
  copiedDate.setHours(0, 0, 0, 0);
  return copiedDate;
};

const formatDate = (date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const getSpanishDayName = (dateString) => {
  const date = new Date(`${dateString}T12:00:00`);

  return date.toLocaleDateString("es-ES", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
};

const isPastSlot = (dayDate, startTime) => {
  const slotDateTime = new Date(`${dayDate}T${startTime}:00`);
  const now = new Date();

  return slotDateTime < now;
};

export const Classes = () => {
  const navigate = useNavigate();

  const [coaches, setCoaches] = useState([]);
  const [selectedCoach, setSelectedCoach] = useState(null);
  const [availability, setAvailability] = useState(null);

  const [weekStart, setWeekStart] = useState(formatDate(getMonday(new Date())));

  const [formData, setFormData] = useState({
    date: "",
    start_time: "",
    end_time: "",
    class_type: "private",
    level: "",
    price: CLASS_PRICE,
  });

  const [loading, setLoading] = useState(true);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
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

  const getAvailability = async (coachId, selectedWeekStart) => {
    try {
      setAvailabilityLoading(true);
      setError("");

      const response = await fetch(
        `${backendUrl}/api/coaches/${coachId}/availability?date=${selectedWeekStart}`
      );

      if (!response.ok) {
        throw new Error("Error al cargar disponibilidad");
      }

      const data = await response.json();
      setAvailability(data);
    } catch (error) {
      console.error(error);
      setError("No se pudo cargar la disponibilidad del profesor");
    } finally {
      setAvailabilityLoading(false);
    }
  };

  useEffect(() => {
    getCoaches();
  }, []);

  useEffect(() => {
    if (selectedCoach) {
      getAvailability(selectedCoach.id, weekStart);
    }
  }, [selectedCoach, weekStart]);

  const openReservationForm = (coach) => {
    const loggedUser = getLoggedUser();

    if (!loggedUser) {
      setError("Debes iniciar sesión para reservar una clase");
      navigate("/login");
      return;
    }

    setSelectedCoach(coach);
    setAvailability(null);
    setMessage("");
    setError("");

    setFormData({
      date: "",
      start_time: "",
      end_time: "",
      class_type: "private",
      level: "",
      price: CLASS_PRICE,
    });
  };

  const closeReservationForm = () => {
    setSelectedCoach(null);
    setAvailability(null);
    setMessage("");
    setError("");

    setFormData({
      date: "",
      start_time: "",
      end_time: "",
      class_type: "private",
      level: "",
      price: CLASS_PRICE,
    });
  };

  const goToPreviousWeek = () => {
    const current = new Date(`${weekStart}T12:00:00`);
    current.setDate(current.getDate() - 7);
    setWeekStart(formatDate(current));
  };

  const goToNextWeek = () => {
    const current = new Date(`${weekStart}T12:00:00`);
    current.setDate(current.getDate() + 7);
    setWeekStart(formatDate(current));
  };

  const handleSlotClick = (day, slot) => {
    const pastSlot = isPastSlot(day.date, slot.start_time);

    if (!slot.available || pastSlot) {
      return;
    }

    setFormData({
      ...formData,
      date: day.date,
      start_time: slot.start_time,
      end_time: slot.end_time,
      price: CLASS_PRICE,
    });

    setMessage(
      `Horario seleccionado: ${day.date} de ${slot.start_time} a ${slot.end_time}`
    );
    setError("");
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData({
      ...formData,
      [name]: value,
      price: CLASS_PRICE,
    });
  };

  const handleReservationSubmit = async (event) => {
    event.preventDefault();

    const loggedUser = getLoggedUser();

    if (!loggedUser) {
      setError("Debes iniciar sesión para reservar una clase");
      navigate("/login");
      return;
    }

    if (!selectedCoach) {
      setError("Selecciona un entrenador");
      return;
    }

    if (!formData.date || !formData.start_time || !formData.end_time) {
      setError("Selecciona primero una hora libre del calendario");
      return;
    }

    const selectedDateTime = new Date(
      `${formData.date}T${formData.start_time}:00`
    );

    if (selectedDateTime < new Date()) {
      setError("No puedes reservar una clase en una fecha u hora pasada");
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
          user_id: loggedUser.id,
          coach_id: selectedCoach.id,
          date: formData.date,
          start_time: formData.start_time,
          end_time: formData.end_time,
          class_type: formData.class_type,
          level: formData.level,
          price: CLASS_PRICE,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al crear la reserva de clase");
      }

      setMessage("Clase reservada correctamente");

      setFormData({
        date: "",
        start_time: "",
        end_time: "",
        class_type: "private",
        level: "",
        price: CLASS_PRICE,
      });

      getAvailability(selectedCoach.id, weekStart);
    } catch (error) {
      console.error(error);
      setError(error.message || "No se pudo reservar la clase");
    }
  };

  const loggedUser = getLoggedUser();
  const currentWeekStart = formatDate(getMonday(new Date()));
  const disablePreviousWeek = weekStart <= currentWeekStart;

  return (
    <div className="container my-5">
      <h1 className="fw-bold mb-3">Reservar clase</h1>

      <p className="text-muted">
        Elige un entrenador y selecciona una hora disponible en el calendario
        semanal.
      </p>

      <div className="alert alert-info">
        Precio fijo de clase: <strong>360 SAR</strong>. Horario habitual
        mostrado: de 16:00 a 00:00.
      </div>

      {!loggedUser && (
        <div className="alert alert-warning">
          Debes iniciar sesión para poder reservar una clase.
        </div>
      )}

      {loggedUser && (
        <div className="alert alert-info">
          Reserva como: <strong>{loggedUser.name || loggedUser.email}</strong>
        </div>
      )}

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
                  <strong>Precio clase:</strong> 360 SAR
                </p>

                <p className="text-muted">
                  {coach.bio || "Entrenador de pádel disponible."}
                </p>

                <button
                  className="btn btn-success w-100"
                  disabled={!coach.is_active}
                  onClick={() => openReservationForm(coach)}
                >
                  Ver disponibilidad
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedCoach && (
        <div className="card shadow-sm mt-5">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
              <div>
                <h3 className="fw-bold mb-1">
                  Disponibilidad de {selectedCoach.name}
                </h3>
                <p className="text-muted mb-0">
                  Selecciona una hora libre. Las horas pasadas aparecerán
                  bloqueadas.
                </p>
              </div>

              <button
                className="btn btn-outline-secondary btn-sm"
                onClick={closeReservationForm}
              >
                Cerrar
              </button>
            </div>

            <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
              <button
                className="btn btn-outline-success btn-sm"
                onClick={goToPreviousWeek}
                disabled={disablePreviousWeek}
              >
                Semana anterior
              </button>

              <strong>Semana del {weekStart}</strong>

              <button
                className="btn btn-outline-success btn-sm"
                onClick={goToNextWeek}
              >
                Semana siguiente
              </button>
            </div>

            {availabilityLoading && <p>Cargando disponibilidad...</p>}

            {availability && (
              <div className="table-responsive mb-4">
                <table
                  className="table table-bordered align-middle text-center"
                  style={{ minWidth: "1000px" }}
                >
                  <thead className="table-success">
                    <tr>
                      {availability.days.map((day) => (
                        <th key={day.date}>{getSpanishDayName(day.date)}</th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    <tr>
                      {availability.days.map((day) => (
                        <td key={day.date} style={{ minWidth: "140px" }}>
                          <div className="d-grid gap-2">
                            {day.slots.map((slot) => {
                              const pastSlot = isPastSlot(
                                day.date,
                                slot.start_time
                              );

                              const disabledSlot = !slot.available || pastSlot;

                              return (
                                <button
                                  key={`${day.date}-${slot.start_time}`}
                                  type="button"
                                  className={
                                    disabledSlot
                                      ? "btn btn-outline-secondary btn-sm"
                                      : "btn btn-outline-success btn-sm"
                                  }
                                  disabled={disabledSlot}
                                  onClick={() => handleSlotClick(day, slot)}
                                >
                                  {slot.start_time} - {slot.end_time}
                                  <br />
                                  {pastSlot
                                    ? "Pasado"
                                    : slot.available
                                    ? "Libre"
                                    : "Ocupado"}
                                </button>
                              );
                            })}
                          </div>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            <h4 className="fw-bold mb-3">Confirmar reserva</h4>

            <form onSubmit={handleReservationSubmit}>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label">Usuario</label>
                  <input
                    type="text"
                    className="form-control"
                    value={loggedUser?.name || loggedUser?.email || ""}
                    disabled
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label">Profesor</label>
                  <input
                    type="text"
                    className="form-control"
                    value={selectedCoach.name}
                    disabled
                  />
                </div>

                <div className="col-md-4">
                  <label className="form-label">Fecha</label>
                  <input
                    type="date"
                    className="form-control"
                    name="date"
                    value={formData.date}
                    min={formatDate(new Date())}
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
                    <option value="private">Privada</option>
                    <option value="group">Grupal</option>
                  </select>
                </div>

                <div className="col-md-4">
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

                <div className="col-md-4">
                  <label className="form-label">Precio</label>
                  <input
                    type="number"
                    className="form-control"
                    name="price"
                    value={formData.price}
                    disabled
                  />
                </div>
              </div>

              <button className="btn btn-success mt-4" type="submit">
                Confirmar clase - 360 SAR
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};