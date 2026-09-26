import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";
import { useNotify } from "../notify.jsx";
import { remainText } from "../ui.js";

const HALLS = ["Assigamé", "Bè", "Tokoin", "Hedzranawoé", "Déckon", "Adidogomé", "Kégué", "Agoè"];
const HALL_COORDS = {
  Assigamé: [6.1378, 1.2227],
  Bè: [6.1315, 1.245],
  Tokoin: [6.16, 1.21],
  Hedzranawoé: [6.186, 1.198],
  Déckon: [6.148, 1.23],
  Adidogomé: [6.1865, 1.145],
  Kégué: [6.178, 1.268],
  Agoè: [6.23, 1.19],
};
const PRICE_BANDS = [
  { ratio: 1, label: "100 %" },
  { ratio: 0.85, label: "85 %" },
  { ratio: 0.7, label: "70 %" },
  { ratio: 0.5, label: "50 %" },
];

function pinStyle(name) {
  const coords = HALL_COORDS[name];
  if (!coords) return { top: "46%", left: "46%" };
  const [lat, lng] = coords;
  const top = ((6.26 - lat) / (6.26 - 6.1)) * 100;
  const left = ((lng - 1.12) / (1.3 - 1.12)) * 100;
  return {
    top: `${Math.min(86, Math.max(8, top))}%`,
    left: `${Math.min(86, Math.max(6, left))}%`,
  };
}

function bandRatio(offer) {
  if (!offer) return null;
  const fraction = Number(offer.hours_left || 0) / hoursRefOf(offer);
  if (fraction >= 0.75) return 1;
  if (fraction >= 0.5) return 0.85;
  if (fraction >= 0.25) return 0.7;
  return 0.5;
}

function bandY(ratio) {
  return 8 + (1 - ratio) * 120;
}
const CATEGORIES = [
  ["tomate", "Tomates"],
  ["poisson", "Poissons"],
  ["banane", "Plantains"],
  ["autre", "Autres"],
];
const DELAYS = [
  ["all", "Tous les délais"],
  ["urgent", "Moins de 8 h"],
  ["day", "De 8 à 24 h"],
  ["later", "Plus de 24 h"],
];
const HOURS_REF = { tomate: 36, poisson: 8, banane: 48, autre: 48 };
const STEP_LEVELS = [0.75, 0.5, 0.25];

function hoursRefOf(offer) {
  return Number(offer?.hours_ref || HOURS_REF[offer?.category] || 48);
}

function nextStepMs(offer, now) {
  if (!offer) return null;
  const leftMs = offer.expires_at
    ? new Date(offer.expires_at).getTime() - now
    : Number(offer.hours_left || 0) * 3600000;
  if (leftMs <= 0) return 0;
  const fraction = leftMs / (hoursRefOf(offer) * 3600000);
  const next = STEP_LEVELS.find((level) => fraction >= level);
  if (next == null) return null;
  return leftMs - next * hoursRefOf(offer) * 3600000;
}

function formatRemain(ms) {
  if (ms == null) return "Palier plancher";
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return `${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`;
}

function stockText(list) {
  if (!list.length) return "0 lot";
  const units = [...new Set(list.map((offer) => offer.unit))];
  const qty = list.reduce((sum, offer) => sum + Number(offer.qty_available || 0), 0);
  if (units.length === 1) return `${qty.toLocaleString("fr-FR")} ${units[0]} restants`;
  return `${list.length} lots restants`;
}

function matchesDelay(offer, delay) {
  const hours = Number(offer.hours_left || 0);
  if (delay === "urgent") return hours < 8;
  if (delay === "day") return hours >= 8 && hours < 24;
  if (delay === "later") return hours >= 24;
  return true;
}

function PromoBanner({
  quarter,
  rows,
  soonest,
  now,
  stockPercent,
  stockLabel,
  onRules,
}) {
  const place = quarter ? `${quarter}, Lomé` : "Lomé";
  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-primary via-primary-container to-primary p-space-lg text-on-primary shadow-md">
      <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-secondary-container/10 blur-2xl" />
      <div className="relative z-10 flex flex-col justify-between gap-space-md md:flex-row md:items-center">
        <div className="flex max-w-xl flex-col gap-space-xs">
          <div className="flex flex-wrap items-center gap-space-xs">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary-container px-space-sm py-0.5 font-label-sm uppercase tracking-wider text-on-secondary-container">
              <span className="h-2 w-2 animate-ping rounded-full bg-secondary" />
              Alerte Évaporation Lomé
            </span>
            <span className="font-body-sm text-on-primary/80">
              {place} · {rows.length} publié{rows.length > 1 ? "s" : ""}
            </span>
          </div>
          <h1 className="font-headline-lg font-bold leading-tight text-on-primary">Déstockage d'Urgence : Périssables à Sauver</h1>
          <p className="max-w-xl font-body-md text-primary-fixed-dim">
            Prix dégressifs automatiques avant basculement de cycle. Stocks géolocalisés vérifiés par vision artificielle à Lomé.
          </p>
        </div>
        <div className="flex flex-col items-start gap-space-md rounded-lg bg-surface/10 px-space-lg py-space-md backdrop-blur-md sm:flex-row sm:items-center">
          <div className="flex items-center gap-space-sm">
            <div className="flex items-center justify-center rounded-full bg-secondary-container p-2 text-on-secondary-container">
              <span className="material-symbols-outlined text-xl">timer</span>
            </div>
            <div className="flex flex-col">
              <span className="font-label-sm uppercase text-primary-fixed-dim">Prochain palier dégressif</span>
              <span className="font-price-display font-mono tracking-tight text-on-primary">{soonest ? formatRemain(nextStepMs(soonest, now)) : "—"}</span>
            </div>
          </div>
          <div className="hidden h-8 w-px bg-on-primary/10 sm:block" />
          <button type="button" onClick={onRules} className="flex items-center gap-1 rounded-full bg-primary-fixed px-space-md py-space-xs font-label-md text-on-primary-fixed hover:bg-surface-container-lowest">
            <span>Règles FCFA</span>
            <span className="material-symbols-outlined text-sm">north_east</span>
          </button>
        </div>
      </div>
      <div className="relative z-10 mt-space-md flex items-center gap-space-sm pt-space-xs">
        <span className="whitespace-nowrap font-label-sm text-primary-fixed-dim">Stock encore en vente : {stockPercent} %</span>
        <div className="h-2 w-full overflow-hidden rounded-full bg-surface/20">
          <div className="h-2 rounded-full bg-secondary-container transition-all duration-500" style={{ width: `${stockPercent}%` }} />
        </div>
        <span className="whitespace-nowrap font-label-sm font-bold text-on-primary">{stockLabel}</span>
      </div>
    </div>
  );
}

function PromoOffer({ open, lots, cut, onOpen }) {
  const count = lots.length;
  if (!count && !open) return null;
  const names = [...new Set(lots.map((lot) => lot.product).filter(Boolean))];
  const thumbs = lots.slice(0, 4);
  const extra = Math.max(0, count - thumbs.length);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group relative w-full overflow-hidden rounded-2xl text-left shadow-[0_16px_40px_-20px_rgba(167,57,24,0.65)]"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-[#7a1a12] via-[#c44520] to-[#e8a317]" />
      <div className="absolute -left-10 top-1/2 h-40 w-40 -translate-y-1/2 rounded-full bg-white/10 blur-2xl" />
      <div className="relative flex items-stretch gap-4 px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex min-w-0 flex-1 flex-col justify-center">
          <p className="inline-flex w-fit items-center gap-1 rounded-full bg-[#ffd56a] px-2.5 py-0.5 font-label-sm font-extrabold uppercase tracking-[0.14em] text-[#7a1a12]">
            Offre groupée
          </p>
          <p className="mt-2 font-headline-md text-[22px] font-black leading-tight text-white sm:text-[28px]">
            {open ? `${count} article${count > 1 ? "s" : ""} en réduction` : "Viens, tout est regroupé au même prix cassé"}
          </p>
          <p className="mt-1 font-body-sm text-white/90 sm:font-body-md">
            {open
              ? "Tous les lots dont un producteur a appliqué la baisse sont ici, ensemble."
              : `${count} lot${count > 1 ? "s" : ""}${cut ? ` · jusqu’à −${cut} %` : ""}${names.length ? ` · ${names.slice(0, 3).join(", ")}${names.length > 3 ? "…" : ""}` : ""}. Clique pour tout voir.`}
          </p>
        </div>
        <div className="hidden shrink-0 items-center sm:flex">
          {thumbs.map((lot, index) => (
            <img
              key={lot.id}
              src={lot.image_url || "/logo.png"}
              alt=""
              className="h-16 w-16 rounded-2xl object-cover ring-2 ring-white/80"
              style={{ marginLeft: index === 0 ? 0 : -14, zIndex: thumbs.length - index }}
            />
          ))}
          {extra > 0 && (
            <span className="relative z-10 -ml-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#7a1a12] font-label-md font-extrabold text-white ring-2 ring-white/80">
              +{extra}
            </span>
          )}
        </div>
        <span className="flex shrink-0 items-center self-center rounded-full bg-white px-4 py-2.5 font-label-md font-extrabold text-[#a73918] group-hover:bg-[#ffd56a]">
          {open ? "Tout le marché" : "Voir tout"}
          <span className="material-symbols-outlined ml-1 text-[18px]">{open ? "close" : "arrow_forward"}</span>
        </span>
      </div>
    </button>
  );
}

export default function MarchePage() {
  const { user } = useAuth();
  const notes = useNotify();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [quarter, setQuarter] = useState(() => params.get("quartier") || "");
  const [category, setCategory] = useState("");
  const [delay, setDelay] = useState("all");
  const [sort, setSort] = useState("urgent");
  const [volume, setVolume] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [placeOpen, setPlaceOpen] = useState(false);
  const [pickedId, setPickedId] = useState("");
  const [now, setNow] = useState(Date.now());
  const promoOnly = params.get("promo") === "1";

  useEffect(() => {
    let alive = true;
    api.catalog()
      .then((data) => {
        if (alive) setRows(Array.isArray(data) ? data : []);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const halls = useMemo(() => {
    const extra = rows.map((offer) => offer.quarter).filter((name) => name && !HALLS.includes(name));
    return [...HALLS, ...new Set(extra)];
  }, [rows]);

  const promoRows = useMemo(
    () => rows.filter((offer) => offer.promo && offer.channel !== "rotten"),
    [rows],
  );
  const promoSoonest = useMemo(
    () => [...promoRows].sort((a, b) => Number(a.hours_left || 0) - Number(b.hours_left || 0))[0] || null,
    [promoRows],
  );
  const promoCut = promoRows.reduce((max, offer) => Math.max(max, Number(offer.promo_cut || 0)), 0);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const next = rows.filter((offer) => {
      if (promoOnly) return Boolean(offer.promo);
      if (offer.channel === "transform" && !offer.promo) return false;
      if (quarter && offer.quarter !== quarter) return false;
      if (category && offer.category !== category) return false;
      if (volume && Number(offer.qty_available || 0) < 10) return false;
      if (!matchesDelay(offer, delay)) return false;
      if (!needle) return true;
      return `${offer.product} ${offer.quarter} ${offer.adresse_collecte}`.toLowerCase().includes(needle);
    });
    next.sort((a, b) => {
      if (Boolean(a.promo) !== Boolean(b.promo)) return a.promo ? -1 : 1;
      if (sort === "price") return Number(a.published_price || 0) - Number(b.published_price || 0);
      if (sort === "qty") return Number(b.qty_available || 0) - Number(a.qty_available || 0);
      return Number(a.hours_left || 0) - Number(b.hours_left || 0);
    });
    return next;
  }, [rows, query, quarter, category, delay, sort, volume, promoOnly]);

  const picked = visible.find((offer) => offer.id === pickedId) || null;
  const soonest = useMemo(
    () => [...visible].sort((a, b) => Number(a.hours_left || 0) - Number(b.hours_left || 0))[0] || null,
    [visible],
  );
  const stockInitial = visible.reduce((sum, offer) => sum + Number(offer.qty_initial || offer.qty_available || 0), 0);
  const stockLeft = visible.reduce((sum, offer) => sum + Number(offer.qty_available || 0), 0);
  const stockPercent = stockInitial > 0 ? Math.max(0, Math.min(100, Math.round((stockLeft / stockInitial) * 100))) : 0;
  const stockLabel = stockText(visible);
  const sortLabel = sort === "price" ? "Prix croissant" : sort === "qty" ? "Quantité" : "Urgence d'évacuation";
  const initials = String(user?.full_name || "LM").split(" ").slice(0, 2).map((part) => part[0] || "").join("").toUpperCase();
  const roleLabel = user ? (user.role === "seller" ? "Producteur" : "Client") : "Sans compte";
  const freshPrice = Number(soonest?.market_price || 0);
  const dropPercent = soonest && freshPrice > 0 ? Math.max(0, Math.round((1 - Number(soonest.published_price || 0) / freshPrice) * 100)) : 0;
  const hallCounts = Object.fromEntries(halls.map((name) => [name, rows.filter((offer) => offer.quarter === name).length]));
  const radar = halls.filter((name) => hallCounts[name] > 0);
  const activeRatio = bandRatio(soonest);
  const curvePoints = PRICE_BANDS.map((band, index) => `${index * 100},${bandY(band.ratio)}`).join(" ");

  function cycleSort() {
    setSort((current) => (current === "urgent" ? "price" : current === "price" ? "qty" : "urgent"));
  }

  function togglePromo() {
    const next = new URLSearchParams(params);
    if (promoOnly) next.delete("promo");
    else next.set("promo", "1");
    const query = next.toString();
    navigate(query ? `/marche?${query}` : "/marche");
  }

  function openAccount() {
    if (!user) {
      navigate("/connexion?suite=" + encodeURIComponent("/marche"));
      return;
    }
    navigate(user.role === "seller" ? "/vendeur" : "/client");
  }

  function choose(offer) {
    setPickedId(offer.id);
    notes.push({
      id: "finalize",
      tone: "warning",
      keep: true,
      title: "Finalise la réservation",
      body: `${offer.product} · ${offer.quarter}`,
      href: `/reservation?id=${offer.id}`,
    });
  }

  function finalize() {
    if (!picked) return;
    navigate("/reservation?id=" + picked.id);
  }

  useEffect(() => {
    if (pickedId) return undefined;
    notes.release("finalize");
    return undefined;
  }, [pickedId]);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-surface/90 backdrop-blur-md shadow-[0_1px_8px_rgba(0,0,0,0.04)]"><div className="h-16 max-w-7xl mx-auto px-margin flex items-center justify-between gap-space-md"><div className="flex items-center gap-space-lg"><div className="flex items-center gap-space-sm"><span className="brand-orbit"><img alt="LocalMatch" className="brand-mark" src="/logo.png" /></span></div><div className="relative hidden xl:block"><button type="button" onClick={() => setPlaceOpen((open) => !open)} className="flex items-center gap-space-xs px-space-md py-space-xs rounded-full max-w-[240px] bg-surface-container text-on-surface"><span className="material-symbols-outlined text-primary text-base">location_on</span><span className="font-label-md text-label-md truncate max-w-[190px]">{quarter ? "Lomé - " + quarter : "Lomé - tous les quartiers"}</span><span className="material-symbols-outlined text-outline text-sm">expand_more</span></button>{placeOpen ? <div className="absolute z-50 mt-2 w-64 rounded-xl bg-surface-container-lowest shadow-md p-2 flex flex-col max-h-80 overflow-auto"><button type="button" onClick={() => { setQuarter(""); setPlaceOpen(false); }} className="text-left px-3 py-2 rounded-lg hover:bg-surface-container font-label-md">Tous les quartiers ({rows.length})</button>{halls.map((name) => <button key={name} type="button" onClick={() => { setQuarter(name); setPlaceOpen(false); }} className="text-left px-3 py-2 rounded-lg hover:bg-surface-container font-label-md">{name} ({hallCounts[name] || 0})</button>)}</div> : null}</div></div><nav className="hidden lg:flex items-center gap-space-md" data-active-classes="bg-primary-container text-on-primary-container font-semibold rounded-lg px-space-md py-space-xs"><a className="font-label-lg text-label-lg bg-primary-container text-on-primary-container font-semibold rounded-lg px-space-md py-space-xs" data-path="marche-urgence" href="/marche">Marché Urgence</a><a className="font-label-lg text-label-lg text-on-surface-variant hover:text-on-surface transition-colors px-space-md py-space-xs" data-path="scan-ia-vendeur" href="/scan">Scan IA Vendeur</a><a className="font-label-lg text-label-lg text-on-surface-variant hover:text-on-surface transition-colors px-space-md py-space-xs" data-path="detail-reservations" href="/reservation">Détail &amp; Réservations</a><a className="font-label-lg text-label-lg text-on-surface-variant hover:text-on-surface transition-colors px-space-md py-space-xs" data-path="impact-historique" href="/impact">Impact &amp; Historique</a></nav><div className="flex items-center gap-space-md"><div className="hidden md:inline-flex items-center gap-space-xs px-space-sm py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed font-label-sm text-label-sm"><span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>{user ? "Connecté" : "Visiteur"}</div><button aria-label="Notifications" onClick={() => navigate("/alertes")} className="relative p-space-xs rounded-full text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors" type="button"><span className="material-symbols-outlined text-xl">notifications</span>{notes.inbox.length > 0 ? <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-secondary text-on-secondary font-label-sm text-[10px] flex items-center justify-center leading-none">{notes.inbox.length > 9 ? "9+" : notes.inbox.length}</span> : null}</button><button type="button" onClick={openAccount} className="flex items-center gap-space-sm pl-space-xs"><span className="w-8 h-8 rounded-full bg-primary-fixed text-on-primary-fixed flex items-center justify-center font-label-sm font-bold">{initials}</span><div className="hidden xl:flex flex-col text-left"><span className="font-label-md text-label-md text-on-surface font-bold leading-tight">{user ? user.full_name : "Visiteur"}</span><span className="font-body-sm text-body-sm text-on-surface-variant leading-tight">{roleLabel}</span></div></button></div></div></header>{picked ? <div className="fixed inset-x-0 top-16 z-40 px-3 pt-2"><div className="mx-auto flex max-w-3xl items-center justify-between gap-3 rounded-2xl border border-white/40 bg-[rgba(167,57,24,0.55)] px-4 py-3 text-white shadow-[0_8px_24px_-16px_rgba(167,57,24,0.45)] backdrop-blur-md"><div className="min-w-0"><p className="font-label-md font-bold">Finalise la réservation</p><p className="truncate font-body-sm text-white/90">{picked.product} · {picked.quarter} · {Number(picked.published_price || 0).toLocaleString("fr-FR")} FCFA</p></div><button type="button" onClick={finalize} className="inline-flex h-11 shrink-0 items-center rounded-full bg-white px-4 font-label-md font-bold text-[#a73918]">Finaliser</button></div></div> : null}<main className={"w-full flex-1 bg-background pb-20 md:pb-0 " + (picked ? "pt-36" : "pt-16")}><div className="flex flex-col w-full"><div className="w-full max-w-7xl mx-auto px-margin py-space-lg flex flex-col gap-space-lg"><PromoBanner quarter={quarter} rows={rows} soonest={soonest} now={now} stockPercent={stockPercent} stockLabel={stockLabel} onRules={() => setRulesOpen((open) => !open)} />{rulesOpen ? <div className="rounded-xl bg-surface-container-lowest p-4 text-on-surface"><p className="font-label-md font-bold">Paliers du prix en FCFA</p><p className="font-body-sm text-body-sm text-on-surface-variant mt-1">100 % du prix frais tant qu’il reste au moins 75 % du délai, puis 85 %, 70 % et 50 %.</p>{soonest && freshPrice > 0 ? <p className="font-body-sm text-body-sm mt-1">{soonest.product} : prix frais {freshPrice.toLocaleString("fr-FR")} FCFA, prix actuel {Number(soonest.published_price || 0).toLocaleString("fr-FR")} FCFA.</p> : null}</div> : null}<div className="flex flex-col gap-space-md"><div className="flex flex-col lg:flex-row gap-space-sm items-stretch"><div className="relative flex-1"><span className="absolute inset-y-0 left-0 pl-space-md flex items-center pointer-events-none text-outline"><span className="material-symbols-outlined">search</span></span><input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full h-12 pl-11 pr-space-md rounded-lg bg-surface-container-lowest text-on-surface placeholder:text-outline text-body-md focus:outline-none focus:ring-2 focus:ring-primary shadow-sm" placeholder="Produit ou quartier à Lomé" type="search" /></div><div className="flex items-center gap-space-xs overflow-x-auto pb-1 text-nowrap scrollbar-none"><span className="font-label-sm text-label-sm text-on-surface-variant flex items-center pl-1 pr-2"><span className="material-symbols-outlined text-sm mr-1 text-primary">pin_drop</span>
            Quartiers :
          </span><button type="button" onClick={() => setQuarter("")} className={"px-space-md py-2 rounded-lg font-label-md text-label-md shadow-sm " + (quarter === "" ? "bg-primary text-on-primary" : "bg-surface-container-lowest hover:bg-surface-container text-on-surface-variant transition-colors")}>Tous les marchés ({rows.length})</button>{halls.map((name) => <button key={name} type="button" onClick={() => setQuarter(name)} className={"px-space-md py-2 rounded-lg font-label-md text-label-md shadow-sm " + (quarter === name ? "bg-primary text-on-primary" : "bg-surface-container-lowest hover:bg-surface-container text-on-surface-variant transition-colors")}>{name} ({hallCounts[name] || 0})</button>)}</div></div><div className="flex flex-col md:flex-row gap-space-sm md:items-center justify-between bg-surface-container-low p-space-sm rounded-lg"><div className="flex items-center gap-space-xs overflow-x-auto scrollbar-none"><span className="font-label-sm text-label-sm uppercase text-outline px-space-xs">Filière :</span><button type="button" onClick={() => setCategory("")} className={"h-9 px-4 inline-flex items-center shrink-0 whitespace-nowrap rounded-full font-label-sm text-label-sm transition-colors duration-200 " + (category === "" ? "bg-primary-container text-on-primary" : "bg-surface-container-lowest text-on-surface-variant hover:bg-primary-container hover:text-on-primary")}>Tous ({rows.filter((offer) => !quarter || offer.quarter === quarter).length})</button>{CATEGORIES.map(([key, label]) => <button key={key} type="button" onClick={() => setCategory(key)} className={"h-9 px-4 inline-flex items-center shrink-0 whitespace-nowrap rounded-full font-label-sm text-label-sm transition-colors duration-200 " + (category === key ? "bg-primary-container text-on-primary" : "bg-surface-container-lowest text-on-surface-variant hover:bg-primary-container hover:text-on-primary")}>{label} ({rows.filter((offer) => offer.category === key && (!quarter || offer.quarter === quarter)).length})</button>)}</div><div className="flex items-center gap-space-xs overflow-x-auto scrollbar-none"><span className="font-label-sm text-label-sm uppercase text-outline px-space-xs">Délai :</span>{DELAYS.map(([key, label]) => <button key={key} type="button" onClick={() => setDelay(key)} className={"h-9 px-4 inline-flex items-center shrink-0 whitespace-nowrap rounded-full font-label-sm text-label-sm transition-colors duration-200 " + (delay === key ? "bg-primary-container text-on-primary font-semibold" : "bg-surface-container-lowest text-on-surface-variant hover:bg-primary-container hover:text-on-primary")}>{label} ({rows.filter((offer) => (!quarter || offer.quarter === quarter) && (!category || offer.category === category) && matchesDelay(offer, key)).length})</button>)}</div></div></div><div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start"><div className="lg:col-span-8 flex flex-col gap-space-lg"><PromoOffer open={promoOnly} lots={promoRows} cut={promoCut} onOpen={togglePromo} /><div className="flex items-center justify-between"><div className="flex items-baseline gap-space-xs"><h2 className="font-headline-md text-headline-md font-bold text-on-surface">Ventes Flash Prioritaires</h2><span className="font-label-sm text-label-sm text-secondary font-bold">(Chute de prix programmée)</span></div><div className="flex items-center gap-space-xs text-on-surface-variant font-label-sm text-label-sm"><span>Trier par :</span><button type="button" onClick={cycleSort} className="font-semibold text-primary underline">{sortLabel}</button></div></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">{visible.map((offer) => (
            <div key={offer.id} className={"group bg-surface-container-lowest rounded-xl p-space-md shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between " + (pickedId === offer.id ? "ring-2 ring-primary" : offer.promo ? "ring-2 ring-[#a73918]/70" : "")}><div><div className="relative w-full aspect-[4/3] rounded-lg overflow-hidden bg-surface-container"><img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" alt="" src={offer.image_url || "/logo.png"} />{offer.promo ? <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 rounded-full bg-[#a73918] text-white font-label-sm text-label-sm shadow">-{offer.promo_cut || ""}{offer.promo_cut ? " %" : "Promo"}</div> : null}<div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-full bg-secondary text-on-secondary font-label-sm text-label-sm shadow"><span className="material-symbols-outlined text-xs">hourglass_bottom</span><span>{remainText(offer)} restantes</span></div><div className="absolute bottom-2 left-2 bg-inverse-surface/80 backdrop-blur-sm text-inverse-on-surface px-2 py-0.5 rounded font-label-sm text-[10px] flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">scale</span><span>{offer.qty_available} {offer.unit}</span></div></div><div className="pt-space-md flex flex-col gap-1"><h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">{offer.product}</h3><p className="font-body-sm text-body-sm text-on-surface-variant">{offer.quarter} · {offer.adresse_collecte}</p></div></div><div className="pt-space-md mt-space-sm bg-surface-container-low/60 -mx-space-md -mb-space-md p-space-md rounded-b-xl flex items-center justify-between"><div className="flex flex-col"><div className="flex items-center gap-1.5"><span className="font-price-display text-price-display text-primary font-black">{Number(offer.published_price || 0).toLocaleString("fr-FR")}</span><span className="font-price-currency text-price-currency text-primary">FCFA</span></div>{offer.promo && offer.promo_from_price ? <span className="text-[11px] font-bold text-[#a73918] line-through">{Number(offer.promo_from_price).toLocaleString("fr-FR")} FCFA</span> : null}</div><button type="button" onClick={() => choose(offer)} className="px-space-md py-2.5 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-label-md text-label-md flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"><span className="material-symbols-outlined text-base">{pickedId === offer.id ? "check" : "shopping_cart_checkout"}</span><span>{pickedId === offer.id ? "Choisi" : "Choisir"}</span></button></div></div>
          ))}{!loading && visible.length === 0 ? <p className="sm:col-span-2 rounded-xl bg-surface-container-lowest p-6 font-body-md text-on-surface-variant">{promoOnly ? "Aucun lot en réduction spéciale pour le moment." : rows.length === 0 ? "Aucun lot publié pour le moment." : "Aucun lot pour ce filtre."}</p> : null}</div><div className="rounded-xl bg-surface-container-low p-space-lg flex flex-col sm:flex-row items-center justify-between gap-space-md"><div className="flex items-center gap-space-md"><div className="w-12 h-12 rounded-full bg-primary-fixed flex items-center justify-center text-primary"><span className="material-symbols-outlined text-2xl">eco</span></div><div className="flex flex-col"><span className="font-headline-sm text-headline-sm font-bold text-on-surface">Vous avez un camion ou une camionnette ?</span><span className="font-body-sm text-body-sm text-on-surface-variant">Groupez vos commandes pour mutualiser les livraisons depuis Assigamé.</span></div></div><button type="button" onClick={() => setVolume((open) => !open)} className={"px-space-lg py-2.5 rounded-lg font-label-lg text-label-lg shadow whitespace-nowrap " + (volume ? "bg-primary text-on-primary" : "bg-surface-container-lowest text-primary hover:bg-surface-container")}>
            Voir les lots volumineux
          </button></div></div><div className="lg:col-span-4 flex flex-col gap-space-lg"><div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col gap-space-md"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-secondary"></span></span><h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">Radar des Marchés</h3></div><span className="font-label-sm text-label-sm text-outline">Lomé Direct</span></div><div className="relative w-full h-44 rounded-lg overflow-hidden bg-[#d7e3d4]"><iframe title="Carte de Lomé" className="absolute inset-0 h-full w-full border-0" src="https://www.openstreetmap.org/export/embed.html?bbox=1.12%2C6.10%2C1.30%2C6.26&amp;layer=mapnik"></iframe><div className="absolute inset-0 bg-primary/5 pointer-events-none"></div>{radar.length === 0 ? <div className="absolute top-1/3 left-4 z-10 bg-surface/90 backdrop-blur-sm px-2 py-1 rounded-full shadow text-[11px] font-bold text-primary">Aucun lot publié</div> : radar.map((name) => <button key={name} type="button" onClick={() => setQuarter(name)} className="absolute z-10 -translate-x-1/2 -translate-y-1/2 bg-surface/95 backdrop-blur-sm px-2 py-1 rounded-full shadow flex items-center gap-1 text-[11px] font-bold text-primary" style={pinStyle(name)}><span className="w-2 h-2 rounded-full bg-secondary"></span>{name} ({hallCounts[name]})</button>)}</div><div className="rounded-lg bg-surface-container-low p-space-sm flex items-center gap-space-sm"><span className="material-symbols-outlined text-secondary text-xl">trending_up</span><div className="flex flex-col"><span className="font-label-sm text-label-sm font-bold text-on-surface">{rows.length} lot{rows.length > 1 ? "s publiés" : " publié"} à Lomé</span><span className="font-body-sm text-[11px] text-on-surface-variant">Visibles sans compte. Connexion seulement pour réserver.</span></div></div><div className="flex flex-col divide-y divide-surface-container text-body-sm">{rows.slice(0, 4).map((offer) => (
            <div key={offer.id} className="py-2 flex items-center justify-between"><div className="flex items-center gap-2"><span className="material-symbols-outlined text-primary text-base">check_circle</span><span className="text-on-surface font-medium truncate max-w-[160px]">{offer.qty_available} {offer.unit} {offer.product}</span></div><span className="font-label-sm text-label-sm text-outline">{offer.quarter}</span></div>
          ))}</div></div><div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col gap-space-sm"><div className="flex items-center justify-between"><h4 className="font-headline-sm text-headline-sm font-bold text-on-surface">Indice Dégressif du Jour</h4><span className="font-label-sm text-label-sm text-secondary font-bold">{dropPercent > 0 ? "-" + dropPercent + " %" : "Prix actuel"}</span></div><p className="font-body-sm text-[12px] text-on-surface-variant">{soonest ? soonest.product + " : l’IA a estimé le délai restant. Le point orange est le palier en cours." : "Aucun lot publié pour calculer le palier."}</p><div className="w-full h-24 pt-2"><svg className="w-full h-full overflow-visible" fill="none" viewBox="0 0 300 80"><line stroke="currentColor" strokeDasharray="2 2" strokeOpacity="0.08" x1="0" x2="300" y1="20" y2="20"></line><line stroke="currentColor" strokeDasharray="2 2" strokeOpacity="0.08" x1="0" x2="300" y1="50" y2="50"></line><polyline points={curvePoints} fill="none" stroke="#1e523f" strokeLinecap="round" strokeWidth="2.5"></polyline>{PRICE_BANDS.map((band, index) => <circle key={band.label} cx={index * 100} cy={bandY(band.ratio)} r={band.ratio === activeRatio ? 5 : 3} fill={band.ratio === activeRatio ? "#d95d39" : "#1e523f"}></circle>)}</svg></div><div className="flex items-center justify-between text-[11px] text-outline pt-1">{PRICE_BANDS.map((band) => <span key={band.label} className={band.ratio === activeRatio ? "text-secondary font-bold" : ""}>{band.label}{freshPrice > 0 ? " · " + Math.max(1, Math.round(freshPrice * band.ratio)).toLocaleString("fr-FR") + " F" : ""}</span>)}</div></div><div className="rounded-xl bg-gradient-to-br from-surface-container to-surface-container-high p-space-md flex flex-col gap-space-sm"><div className="flex items-start gap-space-sm"><div className="p-2.5 rounded-lg bg-primary text-on-primary"><span className="material-symbols-outlined text-2xl">photo_camera</span></div><div className="flex flex-col"><span className="font-headline-sm text-headline-sm font-bold text-on-surface">Vous vendez au marché ?</span><p className="font-body-sm text-body-sm text-on-surface-variant">
                Prenez une photo de votre cageot : notre IA calcule le niveau de maturité et publie l'annonce en 30 secondes.
              </p></div></div><button type="button" onClick={() => { if (user?.role === "seller") navigate("/vendeur/publier"); else if (user) notes.push({ tone: "error", title: "Publication réservée", body: "Seul un compte producteur peut publier un lot." }); else navigate("/connexion"); }} className="mt-2 w-full py-2.5 px-space-md rounded-lg bg-primary hover:bg-primary-container text-on-primary font-label-md text-label-md flex items-center justify-center gap-2 transition-all shadow-sm"><span className="material-symbols-outlined text-lg">add_a_photo</span><span>Scanner un lot maintenant</span></button></div><div className="rounded-xl bg-surface-container-lowest p-space-md flex flex-col gap-space-xs text-on-surface-variant text-body-sm"><div className="flex items-center gap-1 font-semibold text-on-surface"><span className="material-symbols-outlined text-base text-primary">verified_user</span><span>Collecte au quartier du lot</span></div>{picked ? <><p className="text-[13px] font-bold text-on-surface">{picked.product}</p><p className="text-[12px] leading-relaxed">{picked.quarter} · {Number(picked.published_price || 0).toLocaleString("fr-FR")} FCFA / {picked.unit} · {picked.qty_available} {picked.unit} restants</p><p className="text-[12px] leading-relaxed">La confirmation bloque la quantité 20 minutes. Le producteur valide ensuite et envoie le point de collecte.</p><button type="button" onClick={finalize} className="mt-1 inline-flex h-11 items-center justify-center gap-1 rounded-lg bg-primary px-3 font-label-md text-on-primary"><span className="material-symbols-outlined text-base">lock</span>Finaliser la réservation</button></> : <p className="text-[12px] leading-relaxed">Choisis un lot. Son prix et son quartier s’affichent ici, puis tu finalises la réservation.</p>}</div></div></div></div></div></main><footer className="hidden md:block w-full bg-surface-container-low mt-auto"><div className="max-w-7xl mx-auto px-margin py-space-xl flex flex-col sm:flex-row items-center justify-between gap-space-md text-on-surface-variant"><div className="flex items-center gap-space-sm"><span className="font-label-md text-label-md text-primary font-bold">LocalMatch Lomé</span><span className="text-outline">•</span><span className="font-body-sm text-body-sm">Halte au gaspillage alimentaire au Togo</span></div><div className="flex items-center gap-space-lg font-body-sm text-body-sm"><a className="hover:text-on-surface transition-colors" href="#">Assistance Déckon</a><a className="hover:text-on-surface transition-colors" href="#">Marché Hanoukopé</a><a className="hover:text-on-surface transition-colors" href="#">Modalités FCFA</a></div><span className="font-body-sm text-body-sm">© 2024 LocalMatch PWA. Tous droits réservés.</span></div></footer><nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 h-16 bg-surface/95 backdrop-blur-lg shadow-[0_-2px_12px_rgba(0,0,0,0.06)] flex items-center justify-around px-gutter-mobile" data-active-classes="text-primary-container font-bold"><a className="font-label-lg text-label-lg bg-primary-container text-on-primary-container font-semibold rounded-lg px-space-md py-space-xs" data-path="marche-urgence" href="/marche"><span className="material-symbols-outlined text-2xl">storefront</span><span className="font-label-sm text-label-sm mt-0.5">Marché</span></a><a className="flex flex-col items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors py-1 flex-1" data-path="scan-ia-vendeur" href="/scan"><span className="material-symbols-outlined text-2xl">add_a_photo</span><span className="font-label-sm text-label-sm mt-0.5">Scan IA</span></a><a className="flex flex-col items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors py-1 flex-1" data-path="detail-reservations" href="/reservation"><span className="material-symbols-outlined text-2xl">shopping_bag</span><span className="font-label-sm text-label-sm mt-0.5">Réservations</span></a><a className="flex flex-col items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors py-1 flex-1" data-path="impact-historique" href="/impact"><span className="material-symbols-outlined text-2xl">eco</span><span className="font-label-sm text-label-sm mt-0.5">Impact</span></a></nav>
    </>
  );
}
