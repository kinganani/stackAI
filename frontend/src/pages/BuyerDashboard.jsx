import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Link, Route, Routes, useNavigate } from "react-router-dom";
import DashboardLayout, { CatalogCard, PageHeader, catalogCell, catalogHead } from "../components/DashboardLayout.jsx";
import { api } from "../api.js";
import { useNotify } from "../notify.jsx";
import { remainText } from "../ui.js";

const BuyerContext = createContext(null);

const groups = [
  {
    label: "Marché",
    links: [
      { to: "/client", label: "Proche de moi", icon: "near_me", end: true },
      { to: "/client/recherche", label: "Recherche", icon: "search" },
      { to: "/client/reservations", label: "Réservations", icon: "shopping_bag" },
    ],
  },
];

const categoryLabel = {
  tomate: "Tomates",
  banane: "Plantains",
  poisson: "Poisson",
  autre: "Autres",
};

const statusLabel = {
  pending_priority: "Prioritaire",
  pending_payment: "En attente",
  proof_review: "À voir",
  accepted: "Validée",
  rejected: "Refusée",
  expired: "Expirée",
  no_show: "Non retirée",
};

function fcfa(value) {
  return `${Number(value || 0).toLocaleString("fr-FR")} FCFA`;
}

function km(value) {
  return `${Number(value || 0).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} km`;
}

function when(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function useBuyer() {
  return useContext(BuyerContext);
}

function BuyerShell({ children }) {
  const navigate = useNavigate();
  const notes = useNotify();
  const [query, setQuery] = useState("");
  const [offers, setOffers] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    Promise.all([api.nearby(), api.myReservations()])
      .then(([near, rows]) => {
        if (!alive) return;
        setOffers(Array.isArray(near) ? near : []);
        setReservations(Array.isArray(rows) ? rows : []);
      })
      .catch((err) => {
        if (alive) {
          setError(err.message);
          notes.push({ tone: "error", title: "Marché indisponible", body: err.message });
        }
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  function reserve(offer, qty) {
    const cap = Math.max(1, Number(offer.qty_available) || 1);
    const asked = Math.min(cap, Math.max(1, Math.floor(Number(qty) || 1)));
    navigate(`/reservation?id=${offer.id}&qty=${asked}`);
  }

  return (
    <BuyerContext.Provider value={{ query, setQuery, offers, reservations, error, loading, reserve }}>
      <DashboardLayout groups={groups} home="/client">
        {error && <p className="mb-4 rounded-xl bg-error-container px-4 py-3 font-body-sm text-on-error-container">{error}</p>}
        {children}
      </DashboardLayout>
    </BuyerContext.Provider>
  );
}

function SearchField() {
  const { query, setQuery } = useBuyer();
  return (
    <label className="flex h-11 min-w-[220px] items-center gap-2 rounded-xl bg-white px-3 shadow-sm">
      <span className="material-symbols-outlined text-[20px] text-outline">search</span>
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Rechercher un produit"
        className="w-full bg-transparent font-body-md outline-none"
      />
    </label>
  );
}

function Nearby() {
  const { offers, loading, query, reserve } = useBuyer();
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const rows = [...offers].sort((a, b) => a.distance_km - b.distance_km);
    return needle ? rows.filter((row) => `${row.product} ${row.quarter}`.toLowerCase().includes(needle)) : rows;
  }, [offers, query]);
  const salvage = filtered.filter((row) => row.channel === "transform");
  const classic = filtered.filter((row) => row.channel !== "transform");

  return (
    <>
      <PageHeader icon="nutrition" title="Lots proches" subtitle="Produits de ton rayon. Les lots trop avancés restent proposés à prix réduit, hors marché public.">
        <Link to="/alertes" className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white text-primary shadow-sm" aria-label="Alertes">
          <span className="material-symbols-outlined">notifications</span>
        </Link>
        <SearchField />
      </PageHeader>
      {salvage.length > 0 && (
        <div className="mb-4">
          <OfferTable title="À valoriser — prix réduit" rows={salvage} loading={loading} query={query} onReserve={reserve} salvage />
        </div>
      )}
      <OfferTable title="Encore présentables" rows={classic} loading={loading} query={query} onReserve={reserve} />
    </>
  );
}

function Search() {
  const { offers, loading, query, reserve } = useBuyer();
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];
    return offers.filter((row) => `${row.product} ${row.quarter} ${row.category}`.toLowerCase().includes(needle));
  }, [offers, query]);

  return (
    <>
      <PageHeader icon="search" title="Recherche" subtitle="La recherche reste dans ton rayon. Si le produit n’y est pas, la liste reste vide.">
        <SearchField />
      </PageHeader>
      {!query.trim() && <p className="rounded-[22px] bg-white px-5 py-8 font-body-md text-outline">Saisis un produit, par exemple tomate ou plantain.</p>}
      {query.trim() && <OfferTable title="Résultats" rows={filtered} loading={loading} query={query} onReserve={reserve} />}
    </>
  );
}

function Reservations() {
  const { reservations, loading, query } = useBuyer();
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle ? reservations.filter((row) => `${row.product} ${row.adresse_collecte}`.toLowerCase().includes(needle)) : reservations;
  }, [reservations, query]);
  return (
    <>
      <PageHeader icon="shopping_bag" title="Réservations" subtitle="Après validation, le producteur envoie le point de collecte. Tu choisis le déplacement et tu lances l’itinéraire.">
        <SearchField />
      </PageHeader>
      <CatalogCard title="Toutes les réservations" count={filtered.length}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead className={catalogHead}>
              <tr>
                {["Échéance", "Produit", "Retrait", "Quantité", "Prix", "Statut", "Collecte"].map((head) => (
                  <th key={head} className={`${catalogCell} font-semibold`}>{head}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id} className="border-t border-[#eef2f4]">
                  <td className={`${catalogCell} font-body-sm`}>{when(row.reserved_until)}</td>
                  <td className={`${catalogCell} font-bold text-[#102033]`}>{row.product}</td>
                  <td className={`${catalogCell} font-body-sm text-on-surface-variant`}>{row.adresse_collecte}</td>
                  <td className={`${catalogCell} font-body-sm`}>{row.qty} {row.unit}</td>
                  <td className={`${catalogCell} font-label-md`}>{fcfa(row.amount_due)}</td>
                  <td className={`${catalogCell} font-body-sm text-primary`}>{statusLabel[row.status] || row.status}</td>
                  <td className={catalogCell}>
                    <Link to={`/rdv?id=${row.id}`} className="font-label-md text-primary">
                      {row.status === "accepted" ? "Itinéraire" : "Suivi"}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && filtered.length === 0 && (
          <p className="px-5 py-8 font-body-md text-outline">Aucune réservation pour le moment.</p>
        )}
      </CatalogCard>
    </>
  );
}

function OfferTable({ title, rows, loading, query, onReserve, salvage }) {
  const [qty, setQty] = useState({});
  return (
    <CatalogCard title={title} count={rows.length}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] text-left">
          <thead className={catalogHead}>
            <tr>
              {["Article", "Catégorie", "Distance", "Prix (FCFA)", "Stock", "Statut", "Actions"].map((head) => (
                <th key={head} className={`${catalogCell} font-semibold`}>{head}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((offer) => {
              const rupture = Number(offer.qty_available) <= 0;
              return (
                <tr key={offer.id} className="border-t border-[#eef2f4]">
                  <td className={catalogCell}>
                    <div className="flex items-center gap-3">
                      {offer.image_url ? (
                        <img src={offer.image_url} alt="" className="h-11 w-11 rounded-xl object-cover" />
                      ) : (
                        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-fixed text-primary">
                          <span className="material-symbols-outlined">nutrition</span>
                        </span>
                      )}
                      <span className="font-label-md font-bold text-[#102033]">{offer.product}</span>
                      {salvage || offer.channel === "transform" ? <span className="block font-label-sm text-[#a73918]">Encore exploitable</span> : null}
                    </div>
                  </td>
                  <td className={`${catalogCell} font-body-sm text-on-surface-variant`}>{categoryLabel[offer.category] || offer.category} • {offer.quarter}</td>
                  <td className={`${catalogCell} font-body-sm`}>{km(offer.distance_km)}</td>
                  <td className={`${catalogCell} font-label-md`}>{Number(offer.published_price).toLocaleString("fr-FR")} / {offer.unit}</td>
                  <td className={`${catalogCell} font-bold ${rupture ? "text-secondary" : "text-primary"}`}>{rupture ? "Rupture" : offer.qty_available}</td>
                  <td className={`${catalogCell} font-body-sm text-on-surface-variant`}>{remainText(offer)} restantes</td>
                  <td className={catalogCell}>
                    <div className="flex items-center justify-end gap-2">
                      <input
                        type="number"
                        min="1"
                        max={offer.qty_available}
                        value={qty[offer.id] || 1}
                        onChange={(event) => setQty((current) => ({ ...current, [offer.id]: event.target.value }))}
                        className="h-9 w-16 rounded-lg border border-[#e2e8f0] px-2"
                        aria-label={`Quantité pour ${offer.product}`}
                      />
                      <button type="button" onClick={() => onReserve(offer, Number(qty[offer.id] || 1))} className="h-9 rounded-lg bg-primary px-3 text-on-primary font-label-md">
                        Réserver
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!loading && rows.length === 0 && (
        <p className="px-5 py-8 font-body-md text-outline">
          {query.trim() ? `Aucun « ${query.trim()} » dans ton rayon pour le moment.` : "Aucun lot dans ton rayon pour le moment."}
        </p>
      )}
    </CatalogCard>
  );
}

export default function BuyerDashboard() {
  return (
    <BuyerShell>
      <Routes>
        <Route index element={<Nearby />} />
        <Route path="recherche" element={<Search />} />
        <Route path="reservations" element={<Reservations />} />
      </Routes>
    </BuyerShell>
  );
}
