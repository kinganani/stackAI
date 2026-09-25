import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { fmtFcfa, statusLabel } from "../quartiers.js";
import LotThumb from "../components/LotThumb.jsx";
import { hoursLeftLabel } from "../ui.js";

export default function LotsPage() {
  const [lots, setLots] = useState([]);
  const [error, setError] = useState("");

  async function load() {
    try {
      setLots(await api.mine());
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-margin py-space-lg">
      <div className="flex flex-wrap justify-between items-end gap-space-md mb-space-lg">
        <div>
          <p className="font-label-sm text-secondary uppercase tracking-widest">Producteur</p>
          <h1 className="font-headline-lg text-primary">Mes lots en souffrance</h1>
        </div>
        <Link to="/scan" className="h-11 px-space-lg rounded-xl bg-secondary text-on-secondary font-label-md inline-flex items-center">
          Scan IA · nouveau lot
        </Link>
      </div>
      {error && <p className="text-error mb-space-md">{error}</p>}
      <div className="grid sm:grid-cols-2 gap-space-md">
        {lots.map((lot) => (
          <article key={lot.id} className="rounded-xl overflow-hidden bg-surface-container-lowest shadow-sm flex items-stretch">
            <LotThumb lot={lot} className="w-36 sm:w-44 min-h-[10.5rem] shrink-0" />
            <div className="p-space-md flex-1 min-w-0">
              <Link to={`/lots/${lot.id}`} className="font-headline-sm text-primary">
                {lot.product_name}
              </Link>
              <p className="font-body-sm text-on-surface-variant">
                {lot.qty_available}/{lot.qty_initial} {lot.unit} · {statusLabel(lot.status)}
              </p>
              <p className="font-label-sm text-secondary mt-space-xs">{hoursLeftLabel(lot.hours_left)}</p>
              <p className="font-price-display text-primary">{fmtFcfa(lot.published_price)}</p>
              {lot.status !== "cancelled" && lot.status !== "exhausted" && (
                <button type="button" onClick={() => api.cancelStock(lot.id).then(load)} className="mt-space-sm font-label-md text-error">
                  Retirer du marché
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
      {lots.length === 0 && (
        <p className="rounded-xl bg-surface-container-low p-space-lg text-on-surface-variant">Aucun lot. Déclarez un stock périssable via le scan IA.</p>
      )}
    </div>
  );
}
