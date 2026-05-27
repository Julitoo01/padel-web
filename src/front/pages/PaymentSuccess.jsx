import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

export const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const [message, setMessage] = useState("Confirmando pago...");
  const [error, setError] = useState("");

  const backendUrl = import.meta.env.VITE_BACKEND_URL || "";

  useEffect(() => {
    const confirmPayment = async () => {
      try {
        const sessionId = searchParams.get("session_id");

        if (!sessionId) {
          throw new Error("No se encontró la sesión de pago");
        }

        const response = await fetch(`${backendUrl}/api/payments/confirm`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            session_id: sessionId,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "No se pudo confirmar el pago");
        }

        setMessage(data.message || "Pago confirmado correctamente");
      } catch (error) {
        console.error(error);
        setError(error.message || "Error confirmando el pago");
      }
    };

    confirmPayment();
  }, []);

  return (
    <div className="container my-5">
      <div className="card shadow-sm">
        <div className="card-body text-center p-5">
          {error ? (
            <>
              <h1 className="fw-bold text-danger">Error en el pago</h1>
              <p>{error}</p>
            </>
          ) : (
            <>
              <h1 className="fw-bold text-success">Pago realizado</h1>
              <p>{message}</p>
            </>
          )}

          <div className="d-flex justify-content-center gap-3 mt-4 flex-wrap">
            <Link to="/courts" className="btn btn-success">
              Reservar pista
            </Link>

            <Link to="/classes" className="btn btn-outline-success">
              Reservar clase
            </Link>

            <Link to="/ranking" className="btn btn-outline-dark">
              Ver ranking
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};