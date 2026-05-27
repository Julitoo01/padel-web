import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

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

const formatHeaderDay = (dateString) => {
  const date = new Date(`${dateString}T12:00:00`);
  return date.toLocaleDateString("es-ES", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
};

const isPastSlot = (dayDate, startTime) => {
  const slotDateTime = new Date(`${dayDate}T${startTime}:00`);
  return slotDateTime < new Date();
};

const calculateReservationPrice = (court) => {
  const pricePerHour = Number(court?.price_per_hour || 0);
  return pricePerHour * 1.5;
};

export const Courts = () => {
  const navigate = useNavigate();

  const [courts, setCourts] = useState([]);
  const [selectedCourt, setSelectedCourt] = useState(null);
  const [availability, setAvailability] = useState(null);
  const [loading, setLoading] = useState(true);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [weekStart, setWeekStart] = useState(formatDate(getMonday(new Date())));

  const [formData, setFormData] = useState({
    date: "",
    start_time: "",
    end_time: "",
    price: "",
  });

  const backendUrl = import.meta.env.VITE_BACKEND_URL || "";

  const getLoggedUser = () => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) return null;
    return JSON.parse(storedUser);
  };

  const getCourts = async () => {
    try {
      const response = await fetch(`${backendUrl}/api/courts`);

      if (!response.ok) {
        throw new Error("Error al cargar las pistas");
      }

      const data = await response.json();
      setCourts(data);
    } catch (err) {
      console.error(err);
      setError("No se pudieron cargar las pistas");
    } finally {
      setLoading(false);
    }
  };

  const getAvailability = async (courtId, selectedWeekStart) => {
    try {
      setAvailabilityLoading(true);
      setError("");

      const response = await fetch(
        `${backendUrl}/api/courts/${courtId}/availability?date=${selectedWeekStart}`
      );

      if (!response.ok) {
        throw new Error("Error al cargar disponibilidad");
      }

      const data = await response.json();
      setAvailability(data);
    } catch (err) {
      console.error(err);
      setError("No se pudo cargar la disponibilidad de la pista");
    } finally {
      setAvailabilityLoading(false);
    }
  };

  useEffect(() => {
    getCourts();
  }, []);

  useEffect(() => {
    if (selectedCourt) {
      getAvailability(selectedCourt.id, weekStart);
    }
  }, [selectedCourt, weekStart]);

  const openReservationForm = (court) => {
    const loggedUser = getLoggedUser();

    if (!loggedUser) {
      setError("Debes iniciar sesión para reservar una pista");
      navigate("/login");
      return;
    }

    setSelectedCourt(court);
    setAvailability(null);
    setMessage("");
    setError("");

    setFormData({
      date: "",
      start_time: "",
      end_time: "",
      price: calculateReservationPrice(court),
    });
  };

  const closeReservationForm = () => {
    setSelectedCourt(null);
    setAvailability(null);
    setMessage("");
    setError("");

    setFormData({
      date: "",
      start_time: "",
      end_time: "",
      price: "",
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
    const slotDate = slot.date || day.date;
    const pastSlot = isPastSlot(slotDate, slot.start_time);

    if (!slot.available || pastSlot) return;

    setFormData({
      date: slotDate,
      start_time: slot.start_time,
      end_time: slot.end_time,
      price: calculateReservationPrice(selectedCourt),
    });

    setMessage(
      `Horario seleccionado: ${slotDate} de ${slot.start_time} a ${slot.end_time}`
    );
    setError("");
  };

  const handleReservationSubmit = async (event) => {
    event.preventDefault();

    const loggedUser = getLoggedUser();

    if (!loggedUser) {
      setError("Debes iniciar sesión para reservar una pista");
      navigate("/login");
      return;
    }

    if (!selectedCourt) {
      setError("Selecciona una pista");
      return;
    }

    if (!formData.date || !formData.start_time || !formData.end_time) {
      setError("Selecciona primero un bloque libre del calendario");
      return;
    }

    const selectedDateTime = new Date(
      `${formData.date}T${formData.start_time}:00`
    );

    if (selectedDateTime < new Date()) {
      setError("No puedes reservar una pista en una fecha u hora pasada");
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
          user_id: loggedUser.id,
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

      setFormData({
        date: "",
        start_time: "",
        end_time: "",
        price: calculateReservationPrice(selectedCourt),
      });

      getAvailability(selectedCourt.id, weekStart);
    } catch (err) {
      console.error(err);
      setError(err.message || "No se pudo crear la reserva");
    }
  };

  const loggedUser = getLoggedUser();
  const currentWeekStart = formatDate(getMonday(new Date()));
  const disablePreviousWeek = weekStart <= currentWeekStart;

  return (
    <div className="container my-5">
      <h1 className="fw-bold mb-3">Reservar pista</h1>

      <p className="text-muted">
        Elige una pista y consulta su disponibilidad semanal en bloques de{" "}
        <strong>1 hora y media</strong>.
      </p>

      {!loggedUser && (
        <div className="alert alert-warning">
          Debes iniciar sesión para poder reservar una pista.
        </div>
      )}

      {loggedUser && (
        <div className="alert alert-info">
          Reserva como: <strong>{loggedUser.name || loggedUser.email}</strong>
        </div>
      )}

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
                  <strong>Tipo:</strong> {court.court_type || "No especificado"}
                </p>

                <p className="mb-1">
                  <strong>Precio por hora:</strong> {court.price_per_hour} SAR
                </p>

                <p className="mb-3">
                  <strong>Reserva 1h30:</strong>{" "}
                  {calculateReservationPrice(court)} SAR
                </p>

                <button
                  className="btn btn-success w-100"
                  disabled={!court.is_active}
                  onClick={() => openReservationForm(court)}
                >
                  Ver disponibilidad
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedCourt && (
        <div className="mt-5">
          <div className="card shadow-sm">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
                <div>
                  <h3 className="fw-bold mb-1">
                    Disponibilidad de {selectedCourt.name}
                  </h3>
                  <p className="text-muted mb-0">
                    Selecciona un bloque libre de 1h30.
                  </p>
                </div>

                <button
                  className="btn btn-outline-secondary btn-sm"
                  onClick={closeReservationForm}
                >
                  Cerrar
                </button>
              </div>

              <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-4">
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
                <div className="table-responsive">
                  <table
                    className="table table-bordered align-middle text-center"
                    style={{ minWidth: "1100px" }}
                  >
                    <thead>
                      <tr>
                        {availability.days.map((day) => (
                          <th
                            key={day.date}
                            style={{
                              backgroundColor: "#d9e5df",
                              fontSize: "1.05rem",
                              fontWeight: "700",
                              padding: "12px",
                            }}
                          >
                            {formatHeaderDay(day.date)}
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody>
                      <tr>
                        {availability.days.map((day) => (
                          <td
                            key={day.date}
                            style={{
                              verticalAlign: "top",
                              width: "14.28%",
                              backgroundColor: "#f7f7f7",
                              padding: "8px",
                            }}
                          >
                            <div className="d-grid gap-2">
                              {day.slots.map((slot) => {
                                const slotDate = slot.date || day.date;
                                const pastSlot = isPastSlot(
                                  slotDate,
                                  slot.start_time
                                );
                                const isDisabled =
                                  !slot.available || pastSlot;

                                const borderColor = isDisabled
                                  ? "#e58b8b"
                                  : "#6ea37a";

                                const textColor = isDisabled
                                  ? "#de6f6f"
                                  : "#3d7f4a";

                                return (
                                  <button
                                    key={`${slotDate}-${slot.start_time}-${slot.end_time}`}
                                    type="button"
                                    onClick={() => handleSlotClick(day, slot)}
                                    disabled={isDisabled}
                                    className="btn"
                                    style={{
                                      border: `1px solid ${borderColor}`,
                                      color: textColor,
                                      backgroundColor: "#f8f8f8",
                                      borderRadius: "4px",
                                      padding: "10px 6px",
                                      fontSize: "0.95rem",
                                      lineHeight: "1.2",
                                    }}
                                  >
                                    <div>
                                      {slot.start_time} - {slot.end_time}
                                    </div>
                                    <div className="mt-1">
                                      {pastSlot
                                        ? "Pasado"
                                        : slot.available
                                        ? "Libre"
                                        : "Ocupado"}
                                    </div>
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

              <hr className="my-4" />

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
                    <label className="form-label">Pista</label>
                    <input
                      type="text"
                      className="form-control"
                      value={selectedCourt.name}
                      disabled
                    />
                  </div>

                  <div className="col-md-4">
                    <label className="form-label">Fecha</label>
                    <input
                      type="date"
                      className="form-control"
                      value={formData.date}
                      disabled
                    />
                  </div>

                  <div className="col-md-4">
                    <label className="form-label">Hora inicio</label>
                    <input
                      type="time"
                      className="form-control"
                      value={formData.start_time}
                      disabled
                    />
                  </div>

                  <div className="col-md-4">
                    <label className="form-label">Hora fin</label>
                    <input
                      type="time"
                      className="form-control"
                      value={formData.end_time}
                      disabled
                    />
                  </div>

                  <div className="col-md-4">
                    <label className="form-label">Precio</label>
                    <input
                      type="number"
                      className="form-control"
                      value={formData.price}
                      disabled
                    />
                  </div>
                </div>

                <button className="btn btn-success mt-4" type="submit">
                  Confirmar reserva
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};