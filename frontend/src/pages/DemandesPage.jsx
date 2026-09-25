import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { fmtFcfa, statusLabel } from "../quartiers.js";

export default function DemandesPage() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");

  async function load() {
    try {
      setRows(await api.reservations());
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-margin py-space-lg">
      <p className="font-label-sm text-secondary uppercase tracking-widest">Détail & réservations</p>
      <h1 className="font-headline-lg text-primary mb-space-lg">Demandes de collecte</h1>
      {error && <p className="text-error mb-space-md">{error}</p>}
      <div className="flex flex-col gap-space-md">
        {rows.map((r) => (
          <article key={r.id} className="rounded-xl bg-surface-container-lowest p-space-lg shadow-sm">
            <div className="flex flex-wrap justify-between gap-space-md">
              <div>
                <p className="font-headline-sm">{r.stock.product_name}</p>
                <p className="font-body-sm text-on-surface-variant">
                  {r.buyer_name} · {r.qty} {r.stock.unit} · {fmtFcfa(r.amount_due)}
                </p>
                <span className="inline-block mt-space-xs px-space-sm py-0.5 rounded-full bg-primary-container text-on-primary-container font-label-sm">
                  {statusLabel(r.status)}
                </span>
              </div>
              <div className="flex items-center gap-space-sm">
                <Link to={`/reservations/${r.id}`} className="h-11 px-space-md rounded-lg bg-surface-container font-label-md inline-flex items-center">
                  Bon de retrait
                </Link>
                {["pending_seller", "pending_priority", "pending_payment"].includes(r.status) && (
                  <button type="button" onClick={() => api.accept(r.id).then(load).catch((e) => setError(e.message))} className="h-11 px-space-md rounded-lg bg-primary text-on-primary font-label-md">
                    Accepter
                  </button>
                )}
              </div>
            </div>
          </article>
        ))}
        {rows.length === 0 && <p className="text-on-surface-variant">Pas encore de demande sur vos lots.</p>}
      </div>
    </div>
  );
}
