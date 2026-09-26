import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Logo from "../components/Logo.jsx";
import AccountActions from "../components/AccountActions.jsx";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";
import { remainText } from "../ui.js";

const links = [
  { to: "/marche", label: "Marché" },
  { to: "/reservation", label: "Réserver" },
  { to: "/rdv", label: "Collecte" },
  { to: "/impact", label: "Impact" },
];

function asKg(offer) {
  const qty = Number(offer.qty_available || offer.qty || 0);
  const unit = String(offer.unit || "").toLowerCase();
  if (unit === "kg") return qty;
  if (unit.includes("cageot")) return qty * 15;
  if (unit.includes("régime") || unit.includes("regime")) return qty * 8;
  if (unit.includes("panier")) return qty * 5;
  return qty;
}

function money(value) {
  return `${Number(value || 0).toLocaleString("fr-FR")} FCFA`;
}

export default function ImpactPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [mine, setMine] = useState([]);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("lots");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    api.catalog()
      .then((data) => {
        if (alive) setRows(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (alive) setRows([]);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setBookings([]);
      setMine([]);
      return undefined;
    }
    let alive = true;
    api.myReservations()
      .then((data) => {
        if (alive) setBookings(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (alive) setBookings([]);
      });
    if (user.role === "seller") {
      api.myStocks()
        .then((data) => {
          if (alive) setMine(Array.isArray(data) ? data : []);
        })
        .catch(() => {
          if (alive) setMine([]);
        });
    }
    return () => {
      alive = false;
    };
  }, [user]);

  const kg = rows.reduce((sum, offer) => sum + asKg(offer), 0);
  const value = rows.reduce(
    (sum, offer) => sum + Number(offer.published_price || 0) * Number(offer.qty_available || 0),
    0,
  );
  const quarters = [...new Set(rows.map((offer) => offer.quarter).filter(Boolean))];
  const weather = rows.find((offer) => offer.weather)?.weather || {};
  const co2Kg = kg * 2.5;
  const fast = rows.filter((offer) => Number(offer.hours_left || 0) < 12).length;
  const saleRate = rows.length ? Math.round((fast / rows.length) * 1000) / 10 : 0;
  const stress = Number(weather.stress || 1);
  const byQuarter = useMemo(() => {
    const map = {};
    rows.forEach((offer) => {
      const name = offer.quarter || "Lomé";
      map[name] = (map[name] || 0) + asKg(offer);
    });
    const items = Object.entries(map).sort((a, b) => b[1] - a[1]);
    const max = Math.max(1, ...items.map((item) => item[1]));
    return { items, max };
  }, [rows]);

  const needle = query.trim().toLowerCase();
  const liveLots = rows.filter((offer) => (
    !needle || `${offer.product} ${offer.quarter}`.toLowerCase().includes(needle)
  ));
  const liveBookings = bookings.filter((row) => (
    !needle || `${row.product || ""} ${row.quarter || ""} ${row.status || ""}`.toLowerCase().includes(needle)
  ));
  const liveMine = mine.filter((offer) => (
    !needle || `${offer.product} ${offer.quarter}`.toLowerCase().includes(needle)
  ));

  function printReport() {
    window.print();
  }

  const pendingBookings = bookings.filter((row) => String(row.status || "").includes("pending")).length;

  return (
    <div className="min-h-screen bg-background text-on-surface">
      <header className="fixed top-0 inset-x-0 z-50 bg-surface/90 backdrop-blur-md shadow-[0_1px_8px_rgba(0,0,0,0.04)] print:hidden">
        <div className="h-16 max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-2 min-w-0">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <Logo />
          </Link>
          <nav className="hidden lg:flex items-center gap-1">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`font-label-lg px-3 py-1.5 rounded-lg ${link.to === "/impact" ? "bg-primary-container text-on-primary" : "text-on-surface-variant hover:text-on-surface"}`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <AccountActions />
        </div>
      </header>

      <main id="impact-print" className="pt-16 pb-28 lg:pb-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-5">
          <section className="relative overflow-hidden rounded-xl bg-surface-container p-5 sm:p-8">
            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="max-w-2xl">
                <p className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-container text-on-primary font-label-sm">
                  <span className="material-symbols-outlined text-base">verified</span>
                  Bilan LocalMatch • Lomé {new Date().getFullYear()}
                </p>
                <h1 className="mt-2 font-headline-lg text-headline-lg text-primary tracking-tight">
                  Tableau de bord &amp; impact solidaire
                </h1>
                <p className="mt-2 font-body-md text-on-surface-variant">
                  Chiffres calculés sur les lots réellement publiés. Les clients commandent, les producteurs publient.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2 bg-surface-container-lowest px-3 py-2 rounded-lg">
                  <span className="material-symbols-outlined text-secondary">wb_sunny</span>
                  <div>
                    <p className="font-label-sm text-outline">Météo Lomé</p>
                    <p className="font-label-lg font-bold">
                      {weather.temp_c != null ? `${weather.temp_c} °C` : "—"}
                      {weather.humidity != null ? ` • ${weather.humidity} %` : ""}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={printReport}
                  className="inline-flex items-center gap-1 rounded-lg bg-primary px-4 py-3 font-label-lg text-on-primary"
                >
                  <span className="material-symbols-outlined text-lg">download</span>
                  Rapport
                </button>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Stat
              label="Denrées en vente"
              value={`${Math.round(kg).toLocaleString("fr-FR")} kg`}
              hint={`${rows.length} lot${rows.length > 1 ? "s" : ""} • ${quarters.length} quartier${quarters.length > 1 ? "s" : ""}`}
              icon="scale"
            />
            <Stat
              label="Valeur encore disponible"
              value={money(value)}
              hint="Prix actuel × quantité restante"
              icon="payments"
              tone="secondary"
            />
            <Stat
              label="CO₂ évité (estimé)"
              value={`${(co2Kg / 1000).toFixed(2)} T`}
              hint={`${Math.round(co2Kg).toLocaleString("fr-FR")} kg CO₂e si ces lots sont vendus`}
              icon="eco"
            />
            <Stat
              label="Lots à retirer vite"
              value={`${saleRate} %`}
              hint={`${fast} lot${fast > 1 ? "s" : ""} avec moins de 12 h`}
              icon="bolt"
            />
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 rounded-xl bg-surface-container-lowest p-5">
              <p className="font-label-sm text-secondary font-bold uppercase">Dynamique des flux</p>
              <h2 className="font-headline-md font-bold">Poids disponible par quartier</h2>
              {byQuarter.items.length === 0 ? (
                <p className="mt-6 font-body-md text-on-surface-variant">Aucun lot publié pour le moment.</p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {byQuarter.items.map(([name, weight]) => (
                    <li key={name}>
                      <button
                        type="button"
                        onClick={() => navigate(`/marche?quartier=${encodeURIComponent(name)}`)}
                        className="w-full text-left"
                      >
                        <div className="flex justify-between font-label-md">
                          <span>{name}</span>
                          <span>{Math.round(weight).toLocaleString("fr-FR")} kg</span>
                        </div>
                        <div className="mt-1 h-2 rounded-full bg-surface-container overflow-hidden">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(8, (weight / byQuarter.max) * 100)}%` }} />
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="rounded-xl bg-surface-container p-5 flex flex-col justify-between">
              <div>
                <p className="font-label-sm text-secondary flex items-center gap-1">
                  <span className="material-symbols-outlined text-base">thermostat</span>
                  Impact climat Lomé
                </p>
                <p className="mt-1 font-headline-sm font-bold">Accélération de maturité</p>
                <p className="mt-1 font-body-sm text-on-surface-variant">
                  La chaleur accélère le délai de vente des lots tropicaux.
                </p>
                <p className="mt-4 font-headline-md font-bold text-primary">×{stress.toFixed(1)}</p>
                <p className="font-body-sm text-on-surface-variant">Facteur de stress météo sur la fraîcheur</p>
              </div>
              <Link to="/marche?proche=1" className="mt-4 inline-flex h-11 items-center justify-center rounded-lg bg-primary font-label-md text-on-primary">
                Voir les lots proches
              </Link>
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex gap-2 overflow-x-auto">
                <TabBtn active={tab === "lots"} onClick={() => setTab("lots")} label={`Lots en ligne (${liveLots.length})`} />
                <TabBtn active={tab === "resa"} onClick={() => setTab("resa")} label={`Réservations (${bookings.length})`} />
                {user?.role === "seller" ? (
                  <TabBtn active={tab === "mine"} onClick={() => setTab("mine")} label={`Mes lots (${mine.length})`} />
                ) : null}
              </div>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="h-11 rounded-lg bg-surface-container-lowest px-3 font-body-sm outline-none focus:ring-2 focus:ring-primary sm:w-64"
                placeholder="Filtrer un lot ou quartier"
                type="search"
              />
            </div>

            {tab === "lots" && (
              <LotList
                loading={loading}
                empty="Aucun lot publié pour le moment."
                rows={liveLots}
                actionLabel="Commander"
                onAction={(offer) => navigate(`/reservation?id=${offer.id}`)}
              />
            )}
            {tab === "resa" && (
              user ? (
                liveBookings.length === 0 ? (
                  <p className="rounded-xl bg-surface-container-lowest p-6 font-body-md text-on-surface-variant">
                    {pendingBookings === 0 && bookings.length === 0
                      ? "Aucune réservation. Choisis un lot sur le marché."
                      : "Aucune réservation pour ce filtre."}
                  </p>
                ) : (
                  <ul className="flex flex-col gap-3">
                    {liveBookings.map((row) => (
                      <li key={row.id} className="rounded-xl bg-surface-container-lowest p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <p className="font-label-md font-bold">{row.product || "Lot"}</p>
                          <p className="font-body-sm text-on-surface-variant">{row.quarter} · {row.status} · {money(row.amount_due)}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => navigate(`/rdv?id=${row.id}`)}
                          className="h-11 rounded-lg bg-primary px-4 font-label-md text-on-primary"
                        >
                          Suivre la collecte
                        </button>
                      </li>
                    ))}
                  </ul>
                )
              ) : (
                <div className="rounded-xl bg-surface-container-lowest p-6">
                  <p className="font-body-md text-on-surface-variant">Connecte-toi pour voir tes réservations.</p>
                  <Link to="/connexion?suite=/impact" className="mt-3 inline-flex h-11 items-center rounded-lg bg-primary px-4 font-label-md text-on-primary">Se connecter</Link>
                </div>
              )
            )}
            {tab === "mine" && (
              <LotList
                loading={false}
                empty="Tu n’as pas encore publié de lot."
                rows={liveMine}
                actionLabel="Gérer"
                onAction={() => navigate("/vendeur")}
              />
            )}
          </section>

          <section className="rounded-xl bg-primary text-on-primary p-5 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="font-headline-md font-bold">Lomé, moins de pertes</p>
              <p className="mt-1 font-body-sm text-on-primary-container">
                Un producteur publie. Un client réserve. La collecte se fait au quartier du lot.
              </p>
            </div>
            <Link to={user?.role === "seller" ? "/vendeur/publier" : "/inscription?role=seller"} className="inline-flex h-12 items-center justify-center rounded-lg bg-surface px-4 font-label-lg text-primary">
              Inviter un producteur
            </Link>
          </section>
        </div>
      </main>
    </div>
  );
}

function Stat({ label, value, hint, icon, tone }) {
  return (
    <div className="rounded-xl bg-surface-container-lowest p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-label-sm uppercase tracking-wider text-on-surface-variant">{label}</p>
          <p className={`mt-1 font-headline-md font-extrabold ${tone === "secondary" ? "text-secondary" : "text-primary"}`}>{value}</p>
        </div>
        <span className="material-symbols-outlined text-2xl text-primary">{icon}</span>
      </div>
      <p className="mt-3 font-body-sm text-on-surface-variant">{hint}</p>
    </div>
  );
}

function TabBtn({ active, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-2 rounded-full font-label-md whitespace-nowrap ${active ? "bg-primary text-on-primary" : "bg-surface-container text-on-surface-variant"}`}
    >
      {label}
    </button>
  );
}

function LotList({ rows, empty, loading, actionLabel, onAction }) {
  if (loading) return <p className="rounded-xl bg-surface-container-lowest p-6 font-body-md">Chargement…</p>;
  if (!rows.length) return <p className="rounded-xl bg-surface-container-lowest p-6 font-body-md text-on-surface-variant">{empty}</p>;
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((offer) => (
        <li key={offer.id} className="rounded-xl bg-surface-container-lowest p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <img src={offer.image_url || "/logo.png"} alt="" className="h-16 w-16 rounded-lg object-cover bg-surface-container" />
            <div className="min-w-0">
              <p className="font-headline-sm font-bold truncate">{offer.product}</p>
              <p className="font-body-sm text-on-surface-variant">{offer.quarter} · {offer.qty_available} {offer.unit} · {remainText(offer)}</p>
            </div>
          </div>
          <div className="flex items-center justify-between md:justify-end gap-3">
            <p className="font-label-lg font-bold text-primary">{money(offer.published_price)}</p>
            <button type="button" onClick={() => onAction(offer)} className="h-11 rounded-lg bg-primary px-4 font-label-md text-on-primary">
              {actionLabel}
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
