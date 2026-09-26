import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api.js";
import { fmtFcfa } from "../quartiers.js";
import { useAuth } from "../AuthContext.jsx";
import LotThumb from "../components/LotThumb.jsx";
import { freshnessTone, hoursLeftLabel, lotIsAvailable } from "../ui.js";

export default function LotPage() {
  const { id } = useParams();
  const { isBuyer, isSeller } = useAuth();
  const nav = useNavigate();
  const [lot, setLot] = useState(null);
  const [qty, setQty] = useState(1);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let stop = false;
    async function tick() {
      try {
        const data = await api.stock(id);
        if (stop) return;
        setLot(data);
        setQty((prev) => {
          const max = Number(data.qty_available) || 0;
          if (max < 1) return 0;
          const n = Number(prev);
          if (!Number.isFinite(n) || n < 1) return 1;
          return Math.min(n, max);
        });
      } catch (err) {
        if (!stop) setError(err.message);
      }
    }
    tick();
    const timer = setInterval(tick, 4000);
    return () => {
      stop = true;
      clearInterval(timer);
    };
  }, [id]);

  async function reserve() {
    setError("");
    setBusy(true);
    try {
      const resa = await api.reserve({ stock_id: id, qty: Number(qty) });
      nav(`/reservations/${resa.id}`);
    } catch (err) {
      setError(err.message);
      try {
        const data = await api.stock(id);
        setLot(data);
        const max = Number(data.qty_available) || 0;
        setQty(max < 1 ? 0 : Math.min(Number(qty) || 1, max));
      } catch {
        /* ignore */
      }
    } finally {
      setBusy(false);
    }
  }

  if (!lot && !error) return <p className="px-margin py-space-lg">Chargement du lot…</p>;
  if (!lot) return <p className="px-margin py-space-lg text-error">{error}</p>;

  const available = lotIsAvailable(lot);
  const total = available ? lot.published_price * Number(qty || 0) : 0;
  const saving = lot.market_price > lot.published_price ? lot.market_price - lot.published_price : 0;
  const vision = lot.vision || {};
  const comment = vision.rationale || vision.comment || lot.match_reason;

  return (
    <div>
      <div className="bg-surface-container-low py-space-sm">
        <div className="max-w-7xl mx-auto px-margin flex items-center justify-between font-body-sm">
          <Link to={isSeller ? "/lots" : "/marche"} className="flex items-center gap-1 text-on-surface-variant hover:text-primary">
            <span className="material-symbols-outlined text-base">arrow_back</span>
            {isSeller ? "Mes lots" : "Marché urgence"}
          </Link>
          <span className="text-primary font-label-sm">{lot.quartier} · stock en direct</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-margin py-space-lg grid lg:grid-cols-12 gap-space-xl items-start">
        <div className="lg:col-span-7 flex flex-col gap-space-lg">
          <div className="relative rounded-xl overflow-hidden aspect-[4/3] bg-surface-container">
            <LotThumb lot={lot} className="h-full w-full" />
            <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-transparent to-transparent" />
            <span className="absolute top-4 left-4 bg-primary/90 text-on-primary px-space-md py-1 rounded-full font-label-sm flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">verified</span>
              Certifié Scan IA LocalMatch
            </span>
            <div className="absolute top-4 right-4 bg-surface-container-lowest/90 rounded-lg px-space-sm py-space-xs text-right">
              <div className="font-label-sm text-on-surface-variant uppercase">Temps restant</div>
              <div className="font-label-md text-secondary font-bold">{lot.remaining_label ? `${lot.remaining_label} restantes` : hoursLeftLabel(lot.hours_left)}</div>
            </div>
            <h1 className="absolute bottom-4 left-4 right-4 font-headline-lg text-on-primary">{lot.product_name}</h1>
          </div>

          <div className="bg-surface-container-low rounded-xl p-space-md">
            <div className="flex items-center justify-between">
              <span className="font-label-md flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-primary">eco</span>
                Score global de fraîcheur
              </span>
              <span className="font-headline-md text-primary">{lot.freshness} / 100</span>
            </div>
            <div className="w-full bg-surface-container-highest rounded-full h-3.5 mt-space-sm overflow-hidden">
              <div className="bg-primary h-full rounded-full" style={{ width: `${Math.min(100, lot.freshness || 0)}%` }} />
            </div>
            <p className="font-label-sm text-on-surface-variant mt-space-xs">{freshnessTone(lot.freshness)}</p>
            {comment && <p className="font-body-sm mt-space-sm">{comment}</p>}
          </div>

          <div className="bg-surface-container-lowest rounded-xl p-space-lg">
            <p className="font-headline-sm">{lot.seller_name}</p>
            <p className="font-body-sm text-on-surface-variant">{lot.quartier} · {lot.adresse_collecte}</p>
            {lot.description && <p className="font-body-md mt-space-sm">{lot.description}</p>}
          </div>
        </div>

        <aside className="lg:col-span-5 rounded-xl bg-surface-container-lowest p-space-lg shadow-sm flex flex-col gap-space-md sticky top-24">
          <div>
            <div className="flex items-baseline gap-space-sm">
              <span className="font-headline-xl text-primary font-extrabold tracking-tight">{Number(lot.published_price).toLocaleString("fr-FR")}</span>
              <span className="font-price-currency text-primary uppercase">FCFA</span>
              <span className="font-body-md text-on-surface-variant">/ {lot.unit}</span>
            </div>
            {saving > 0 && (
              <p className="font-body-sm mt-space-xs">
                <span className="line-through text-on-surface-variant">{fmtFcfa(lot.market_price)}</span>
                <span className="ml-space-sm text-secondary font-bold">Prix préférentiel · −{fmtFcfa(saving)}</span>
              </p>
            )}
          </div>

          {error && <p className="text-error font-body-sm">{error}</p>}

          {isBuyer ? (
            available ? (
              <>
                <label className="font-label-md flex justify-between">
                  <span>Quantité à bloquer</span>
                  <span className="text-primary">
                    {lot.qty_available} {lot.unit} restants
                  </span>
                </label>
                <div className="flex items-center justify-between bg-surface-container-low p-space-xs rounded-xl">
                  <div className="flex items-center gap-space-xs">
                    <button type="button" className="w-10 h-10 rounded-lg bg-surface-container-lowest" onClick={() => setQty((q) => Math.max(1, Number(q) - 1))}>
                      −
                    </button>
                    <span className="w-12 text-center font-headline-md text-primary">{qty}</span>
                    <button type="button" className="w-10 h-10 rounded-lg bg-surface-container-lowest" onClick={() => setQty((q) => Math.min(lot.qty_available, Number(q) + 1))}>
                      +
                    </button>
                  </div>
                  <div className="text-right pr-space-sm">
                    <div className="font-label-sm text-on-surface-variant">Total estimé</div>
                    <div className="font-headline-md font-black">{fmtFcfa(total)}</div>
                  </div>
                </div>
                <button disabled={busy} onClick={reserve} className="h-12 rounded-xl bg-secondary text-on-secondary font-label-lg">
                  {busy ? "Réservation…" : "Bloquer la réservation"}
                </button>
              </>
            ) : (
              <p className="rounded-xl bg-error-container text-on-error-container px-space-md py-space-md font-headline-sm">
                Le produit est indisponible
              </p>
            )
          ) : (
            <Link to="/demandes" className="h-12 rounded-xl bg-primary text-on-primary font-label-lg inline-flex items-center justify-center">
              Voir les demandes
            </Link>
          )}
          {(lot.maps_dir_url || lot.maps_url) && (
            <a href={lot.maps_dir_url || lot.maps_url} target="_blank" rel="noreferrer" className="h-11 rounded-xl bg-surface-container text-on-surface font-label-md inline-flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-primary">directions</span>
              Suivre l’itinéraire
            </a>
          )}
        </aside>
      </div>
    </div>
  );
}
