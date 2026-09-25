import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { fmtFcfa, statusLabel } from "../quartiers.js";
import { useAuth } from "../AuthContext.jsx";

export default function ImpactPage() {
  const { isBuyer } = useAuth();
  const [rows, setRows] = useState([]);

  useEffect(() => {
    api.reservations().then(setRows).catch(() => setRows([]));
  }, []);

  const saved = rows.filter((r) => ["accepted", "pending_seller", "pending_priority", "pending_payment"].includes(r.status));
  const kg = saved.reduce((s, r) => s + Number(r.qty || 0), 0);
  const value = saved.reduce((s, r) => s + Number(r.amount_due || 0), 0);

  return (
    <div className="max-w-5xl mx-auto px-margin py-space-lg">
      <p className="font-label-sm text-secondary uppercase tracking-widest">Impact & historique</p>
      <h1 className="font-headline-lg text-primary mb-space-xs">Anti-gaspillage</h1>
      <p className="text-on-surface-variant mb-space-lg">
        {isBuyer ? "Vos collectes réellement bloquées." : "Volumes sauvés via vos ventes d’urgence."}
      </p>
      <div className="grid grid-cols-2 gap-space-md mb-space-xl">
        <div className="rounded-xl bg-primary-container p-space-lg">
          <p className="font-label-sm">Volume locké</p>
          <p className="font-headline-lg">{kg} unités</p>
        </div>
        <div className="rounded-xl bg-secondary-container p-space-lg">
          <p className="font-label-sm">Valeur</p>
          <p className="font-headline-lg">{fmtFcfa(value)}</p>
        </div>
      </div>
      <ul className="flex flex-col gap-space-sm">
        {rows.map((r) => (
          <li key={r.id}>
            <Link to={`/reservations/${r.id}`} className="flex justify-between rounded-xl bg-surface-container-low px-space-md py-space-sm">
              <span>
                {r.stock.product_name} · {r.qty} {r.stock.unit}
              </span>
              <span className="font-label-sm text-primary">{statusLabel(r.status)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
