import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { fmtFcfa } from "../quartiers.js";
import { useAuth } from "../AuthContext.jsx";
import LotThumb from "../components/LotThumb.jsx";
import { freshnessTone, hoursLeftLabel, lotIsAvailable } from "../ui.js";

export default function MarchePage() {
  const { profile } = useAuth();
  const [lots, setLots] = useState([]);
  const [q, setQ] = useState("");
  const [applied, setApplied] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load(search, { silent = false } = {}) {
    if (!silent) setLoading(true);
    if (!silent) setError("");
    try {
      setLots(await api.nearby({ q: search, sort: "score" }));
    } catch (err) {
      setError(err.message);
      if (!silent) setLots([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    load(applied);
    const timer = setInterval(() => load(applied, { silent: true }), 4000);
    return () => clearInterval(timer);
  }, [applied]);

  return (
    <div>
      <div className="bg-surface-container-low py-space-sm">
        <div className="max-w-7xl mx-auto px-margin flex flex-wrap items-center justify-between gap-space-sm">
          <p className="font-body-sm text-on-surface-variant flex items-center gap-1">
            <span className="material-symbols-outlined text-primary text-base">location_on</span>
            Lomé · {profile?.quartier} · rayon {profile?.radius_km || 15} km
          </p>
          <span className="font-label-sm text-primary flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            Matching IA en direct
          </span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-margin py-space-lg">
        <p className="font-label-sm text-secondary uppercase tracking-widest">Marché urgence</p>
        <h1 className="font-headline-lg text-primary">Lots périssables dans votre rayon</h1>
        <p className="font-body-md text-on-surface-variant mt-space-xs mb-space-lg max-w-2xl">
          Seuls les stocks encore collectibles près de {profile?.quartier} apparaissent. Le score mélange proximité, urgence et volume.
        </p>

        <form
          className="flex gap-space-sm mb-space-xl"
          onSubmit={(e) => {
            e.preventDefault();
            setApplied(q);
          }}
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher tomate, mangue, légume…"
            className="flex-1 rounded-xl bg-surface-container-low px-space-md py-3 outline-none focus:ring-2 focus:ring-primary"
          />
          <button className="h-12 px-space-lg rounded-xl bg-primary text-on-primary font-label-md">Filtrer</button>
        </form>

        {error && <p className="text-error mb-space-md">{error}</p>}
        {loading && <p className="text-on-surface-variant">Recherche des lots du rayon…</p>}
        {!loading && lots.length === 0 && (
          <p className="rounded-xl bg-surface-container-low p-space-lg text-on-surface-variant">
            Aucun lot dans ce rayon. Un producteur doit publier à proximité, ou changez de quartier à l’inscription.
          </p>
        )}

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-space-lg">
          {lots.map((lot) => {
            const open = lotIsAvailable(lot);
            return (
            <Link key={lot.id} to={`/lots/${lot.id}`} className={`rounded-xl overflow-hidden bg-surface-container-lowest shadow-sm flex flex-col group ${open ? "" : "opacity-80"}`}>
              <div className="relative aspect-[4/3] overflow-hidden bg-surface-container-low">
                <LotThumb lot={lot} className="h-full w-full" />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-transparent to-transparent" />
                <span className="absolute top-3 left-3 bg-primary/90 text-on-primary font-label-sm px-space-sm py-1 rounded-full">
                  {open ? `Scan IA · ${freshnessTone(lot.freshness)}` : "Indisponible"}
                </span>
                <span className="absolute top-3 right-3 bg-surface/90 text-secondary font-label-md px-space-sm py-1 rounded-lg">
                  {hoursLeftLabel(lot.hours_left)}
                </span>
                <p className="absolute bottom-3 left-3 right-3 font-headline-sm text-on-primary">{lot.product_name}</p>
              </div>
              <div className="p-space-md flex-1 flex flex-col gap-space-xs">
                <div className="flex justify-between items-baseline gap-2">
                  <span className="font-price-display text-primary">{fmtFcfa(lot.published_price)}</span>
                  <span className="font-body-sm text-on-surface-variant">/ {lot.unit}</span>
                </div>
                {open ? (
                  <p className="font-body-sm text-on-surface-variant">
                    {lot.qty_available} {lot.unit} restants · {lot.quartier} · {lot.distance_km} km
                  </p>
                ) : (
                  <p className="font-label-md text-error">Le produit est indisponible</p>
                )}
                {open && <p className="font-label-sm text-primary mt-auto">{lot.match_reason || `Score ${lot.match_score}`}</p>}
              </div>
            </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
