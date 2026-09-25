import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api.js";

export default function NearbyPanel() {
  const navigate = useNavigate();
  const [offers, setOffers] = useState([]);
  const [error, setError] = useState("");
  const [qty, setQty] = useState({});

  async function load() {
    try {
      setOffers(await api.nearby());
      setError("");
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
    const timer = setInterval(load, 4000);
    return () => clearInterval(timer);
  }, []);

  async function reserve(offer) {
    const asked = Number(qty[offer.id] || 1);
    try {
      const created = await api.reserve({ stock_id: offer.id, qty: asked });
      navigate(`/rdv?id=${created.id}`);
    } catch (err) {
      setError(err.status === 409 ? "Stock déjà pris : 409." : err.message);
    }
  }

  return (
    <section className="relative z-40 mx-auto mt-20 mb-4 w-full max-w-3xl px-4">
      <div className="rounded-2xl border border-[#e2e8f0] bg-surface-container-lowest p-4 shadow-sm">
        <h2 className="font-headline-sm font-bold text-primary">Offres dans mon rayon</h2>
        <p className="font-body-sm text-on-surface-variant">Actualisation toutes les 4 secondes. Hors rayon, la liste reste vide.</p>
        {error && <p className="mt-2 rounded-xl bg-error-container px-3 py-2 font-body-sm text-on-error-container">{error}</p>}
        <div className="mt-3 grid gap-3">
          {offers.map((offer) => (
            <article key={offer.id} className="rounded-xl border border-[#e2e8f0] p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold">{offer.product}</h3>
                  <p className="font-body-sm text-on-surface-variant">{offer.quarter} • {offer.distance_km} km • {offer.qty_available} {offer.unit} • {offer.published_price} FCFA</p>
                  <p className="font-body-sm mt-1">Score {Math.round(offer.score * 100)} % — {offer.phrase}</p>
                </div>
                <div className="flex items-center gap-2">
                  <input type="number" min="1" max={offer.qty_available} value={qty[offer.id] || 1} onChange={(e) => setQty((current) => ({ ...current, [offer.id]: e.target.value }))} className="h-10 w-16 rounded-lg border px-2" />
                  <button type="button" onClick={() => reserve(offer)} className="h-10 rounded-xl bg-primary px-3 text-on-primary font-label-md">Réserver</button>
                </div>
              </div>
            </article>
          ))}
          {offers.length === 0 && !error && <p className="font-body-sm text-on-surface-variant">Aucune offre dans le rayon pour le moment.</p>}
        </div>
      </div>
    </section>
  );
}
