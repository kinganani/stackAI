import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Shell from "../components/Shell.jsx";
import CollecteMap from "../components/CollecteMap.jsx";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";
import { useNotify } from "../notify.jsx";

function remainingLabel(iso, now) {
  if (!iso) return "—";
  const ms = new Date(iso).getTime() - now;
  if (ms <= 0) return "Expiré";
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes} min ${String(seconds).padStart(2, "0")} s`;
}

const STATUS = {
  pending_payment: "En attente de validation du producteur",
  pending_priority: "En attente de validation du producteur",
  accepted: "Commande confirmée",
  expired: "Délai dépassé, le lot est de nouveau libre",
  rejected: "Refusée",
  no_show: "Non retirée",
};

const MODES = [
  { id: "driving", label: "Voiture ou moto", icon: "directions_car" },
  { id: "walking", label: "À pied", icon: "directions_walk" },
  { id: "bicycling", label: "Vélo", icon: "directions_bike" },
  { id: "transit", label: "Transport", icon: "directions_bus" },
];

function readPosition() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
  });
}

function CollecteList() {
  const { user, ready } = useAuth();
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!ready || !user) return undefined;
    let alive = true;
    api.myReservations()
      .then((data) => {
        if (alive) setRows(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (alive) setError(err.message);
      });
    return () => {
      alive = false;
    };
  }, [ready, user]);

  return (
    <Shell>
      <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-6 sm:px-6">
        <p className="font-label-sm uppercase tracking-wide text-secondary">Collecte</p>
        <h1 className="font-headline-lg text-headline-lg text-primary">Tes commandes</h1>
        {error && <p className="rounded-xl bg-error-container px-4 py-3 font-body-sm text-on-error-container">{error}</p>}
        {ready && !user && (
          <section className="rounded-2xl border border-[#e2e8f0] bg-surface-container-lowest p-5">
            <p className="font-body-md text-on-surface-variant">Connecte-toi pour suivre une commande, ou choisis un lot sur le marché.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link to="/connexion?suite=/rdv" className="inline-flex h-12 items-center rounded-xl bg-primary px-5 font-label-md text-on-primary">Connexion</Link>
              <Link to="/marche" className="inline-flex h-12 items-center rounded-xl border border-primary px-5 font-label-md text-primary">Marché</Link>
            </div>
          </section>
        )}
        {user?.role === "seller" && (
          <Link to="/vendeur/demandes" className="inline-flex h-12 w-fit items-center rounded-xl bg-primary px-5 font-label-md text-on-primary">Valider les demandes</Link>
        )}
        {user && rows.map((row) => (
          <Link key={row.id} to={`/rdv?id=${row.id}`} className="rounded-2xl border border-[#e2e8f0] bg-surface-container-lowest p-4">
            <p className="font-label-md font-bold text-on-surface">{row.product}</p>
            <p className="font-body-sm text-on-surface-variant">{row.qty} {row.unit} · {Number(row.amount_due || 0).toLocaleString("fr-FR")} FCFA · {row.quarter}</p>
            <p className="mt-1 font-label-sm text-primary">{STATUS[row.status] || row.status}</p>
          </Link>
        ))}
        {user && rows.length === 0 && !error && <p className="font-body-md text-on-surface-variant">Aucune commande pour ce compte.</p>}
      </div>
    </Shell>
  );
}

function CollecteDetail({ id }) {
  const { user } = useAuth();
  const notes = useNotify();
  const [row, setRow] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [now, setNow] = useState(Date.now());
  const [mode, setMode] = useState("driving");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let alive = true;
    function load() {
      api.reservation(id)
        .then((data) => {
          if (alive) setRow(data);
        })
        .catch((err) => {
          if (alive) setError(err.message || "Commande introuvable.");
        });
    }
    load();
    const poll = setInterval(load, 8000);
    return () => {
      alive = false;
      clearInterval(poll);
    };
  }, [id]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const accepted = row?.status === "accepted" && row?.lat != null && row?.lng != null;
  const pending = row?.status === "pending_payment" || row?.status === "pending_priority";
  const seller = user?.role === "seller";
  const amount = row ? Number(row.amount_due || 0).toLocaleString("fr-FR") : "—";
  const detail = row ? `${row.qty} ${row.unit} de ${row.product} • ${amount} FCFA` : error || "Chargement de la commande…";

  async function accept() {
    setSending(true);
    setError("");
    setNotice("");
    try {
      const point = await readPosition();
      const updated = await api.acceptReservation(id, point || {});
      setRow(updated);
      const body = point
        ? "Ta position a été envoyée comme point de collecte."
        : "Position non partagée : le point du lot a été envoyé.";
      setNotice(`Commande validée. ${body}`);
      notes.release("live:pending");
      notes.push({ id: `validated:${id}`, tone: "success", keep: true, title: "Commande validée", body });
    } catch (err) {
      setError(err.message);
      notes.push({ tone: "error", title: "Validation impossible", body: err.message });
    } finally {
      setSending(false);
    }
  }

  return (
    <Shell>
      <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-6 sm:px-6">
        <Link to="/rdv" className="font-label-sm text-primary">Toutes les commandes</Link>
        <p className="font-label-sm uppercase tracking-wide text-secondary">{STATUS[row?.status] || "Commande"}</p>
        <h1 className="font-headline-lg text-headline-lg text-primary">Collecte du lot</h1>
        {error && <p className="rounded-xl bg-error-container px-4 py-3 font-body-sm text-on-error-container">{error}</p>}
        {notice && <p className="rounded-xl border border-[rgba(0,59,41,0.16)] bg-[rgba(0,59,41,0.08)] px-4 py-3 font-body-sm text-[#003b29]">{notice}</p>}
        {row?.image_url && <img src={row.image_url} alt="" className="aspect-[4/3] w-full max-w-sm rounded-2xl object-cover" />}
        <section className="grid grid-cols-3 gap-2 rounded-2xl border border-[#e2e8f0] bg-surface-container-lowest p-4 text-center">
          {[
            ["1", "Commande envoyée", Boolean(row)],
            ["2", "Validation producteur", accepted],
            ["3", "Itinéraire de collecte", accepted && !seller],
          ].map(([step, label, done]) => (
            <div key={step} className={done ? "text-primary" : "text-outline"}>
              <p className="font-headline-sm font-bold">{step}</p>
              <p className="font-label-sm">{label}</p>
            </div>
          ))}
        </section>
        <section className="rounded-2xl bg-primary p-6 text-on-primary">
          <p className="font-label-sm uppercase text-primary-fixed">{accepted ? "Point de collecte reçu" : "Collecte"}</p>
          <p className="mt-2 font-headline-lg text-headline-lg font-bold">{accepted ? (row?.adresse_collecte || row?.quarter || "Lomé") : (row?.quarter || "Lomé")}</p>
          <p className="mt-2 font-body-md text-primary-fixed-dim">{detail}</p>
          {seller && row?.buyer_name && <p className="mt-2 font-body-sm text-primary-fixed">Client : {row.buyer_name}{row.buyer_phone ? ` · ${row.buyer_phone}` : ""}</p>}
          {accepted && !seller && (
            <div className="mt-5 flex flex-col gap-3">
              <p className="font-label-sm text-primary-fixed">Moyen de déplacement</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {MODES.map((item) => (
                  <button key={item.id} type="button" onClick={() => setMode(item.id)} className={`inline-flex h-11 items-center justify-center gap-1 rounded-xl px-2 font-label-sm ${mode === item.id ? "bg-surface text-primary" : "bg-primary-container text-primary-fixed"}`}>
                    <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                    {item.label}
                  </button>
                ))}
              </div>
              <p className="font-body-sm text-primary-fixed">Le plan suit ta position. L’icône de départ avance avec toi jusqu’à l’arrivée.</p>
            </div>
          )}
          {pending && seller && (
            <button type="button" onClick={accept} disabled={sending} className="mt-5 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-surface px-5 font-label-lg text-primary disabled:opacity-60">
              {sending ? "Envoi du point…" : "Valider et envoyer le point"}
            </button>
          )}
          {pending && !seller && <p className="mt-5 font-body-sm text-primary-fixed">Le point de collecte arrive quand le producteur valide.</p>}
          {row?.status === "expired" && <p className="mt-5 font-body-sm text-primary-fixed">Le délai est passé. La quantité est de nouveau en vente.</p>}
        </section>
        {accepted && !seller && (
          <CollecteMap
            destination={{ lat: Number(row.lat), lng: Number(row.lng) }}
            mode={mode}
            fallback={user?.lat != null && user?.lng != null ? { lat: user.lat, lng: user.lng } : null}
          />
        )}
        <section className="grid gap-4 rounded-2xl border border-[#e2e8f0] bg-surface-container-lowest p-5 sm:grid-cols-3">
          {[
            ["schedule", pending ? "Délai de validation" : "État", pending ? remainingLabel(row?.reserved_until, now) : (STATUS[row?.status] || "—")],
            ["inventory_2", "Quantité", row ? `${row.qty} ${row.unit}` : "—"],
            ["sell", "Montant dû", row ? `${amount} FCFA` : "—"],
          ].map(([icon, label, value]) => (
            <div key={label}>
              <span className="material-symbols-outlined text-primary">{icon}</span>
              <p className="mt-1 font-label-sm text-on-surface-variant">{label}</p>
              <p className="font-headline-sm font-bold">{value}</p>
            </div>
          ))}
        </section>
      </div>
    </Shell>
  );
}

export default function RdvPage() {
  const [params] = useSearchParams();
  const id = params.get("id");
  if (!id) return <CollecteList />;
  return <CollecteDetail id={id} />;
}
