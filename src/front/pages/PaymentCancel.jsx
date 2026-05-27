import { Link } from "react-router-dom";

export const PaymentCancel = () => {
  return (
    <div className="container my-5">
      <div className="card shadow-sm">
        <div className="card-body text-center p-5">
          <h1 className="fw-bold text-danger">Pago cancelado</h1>
          <p>No se ha realizado ningún cargo ni se ha creado la reserva.</p>

          <Link to="/" className="btn btn-success mt-3">
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
};