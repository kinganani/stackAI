import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Shell from "../components/Shell.jsx";
import PageHeader from "../components/PageHeader.jsx";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";
import { useNotify } from "../notify.jsx";
import { remainText } from "../ui.js";

function money(value) {
  return `${Number(value || 0).toLocaleString("fr-FR")} FCFA`;
}

export default function ReservationPage() {
  const { user, ready } = useAuth();
  const notes = useNotify();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const id = params.get("id");
  const [lot, setLot] = useState(null);
  const [missing, setMissing] = useState(false);
  const [loading, setLoading] = useState(Boolean(id));
  const [qty, setQty] = useState(1);
  const [draft, setDraft] = useState(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const fromQuery = Number(params.get("qty"));
    if (Number.isFinite(fromQuery) && fromQuery >= 1) setQty(Math.floor(fromQuery));
  }, [params]);

  useEffect(() => {
    if (!id) {
      setLot(null);
      setMissing(false);
      setLoading(false);
      return undefined;
    }
    let alive = true;
    setLoading(true);
    setError("");
    api.catalog()
      .then((data) => {
        if (!alive) return;
        const found = (Array.isArray(data) ? data : []).find((row) => row.id === id) || null;
        setLot(found);
        setMissing(!found);
        if (found) {
          const cap = Math.max(1, Number(found.qty_available) || 1);
          setQty((current) => Math.min(Math.max(1, current), cap));
        }
      })
      .catch((err) => {
        if (alive) setError(err.message);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [id]);

  const available = Math.max(0, Number(lot?.qty_available || 0));
  const asked = Math.min(Math.max(qty, 1), Math.max(available, 1));
  const unitPrice = Number(lot?.published_price || 0);
  const total = unitPrice * asked;

  function typeQty(event) {
    const digits = event.target.value.replace(/\D/g, "").replace(/^0+/, "");
    if (!digits) {
      setDraft("");
      return;
    }
    const next = Math.min(Number(digits), Math.max(available, 1));
    setQty(next);
    setDraft(String(next));
  }

  function stepQty(delta) {
    setDraft(null);
    setQty((current) => Math.min(Math.max(1, current + delta), Math.max(available, 1)));
  }

  async function confirm() {
    if (!ready || pending || !lot || available < 1) return;
    if (!user) {
      navigate(`/connexion?suite=${encodeURIComponent(`/reservation?id=${lot.id}&qty=${asked}`)}`);
      return;
    }
    if (user.role !== "buyer") {
      const message = "Seul un compte client peut réserver un lot.";
      setError(message);
      notes.push({ tone: "error", title: "Réservation refusée", body: message });
      return;
    }
    setPending(true);
    setError("");
    try {
      const created = await api.reserve({ stock_id: lot.id, qty: asked });
      notes.release("finalize");
      notes.push({
        id: `order:${created.id}`,
        tone: "success",
        keep: true,
        title: "Réservation envoyée",
        body: `${lot.product} attend la validation du producteur.`,
        href: `/rdv?id=${created.id}`,
      });
      navigate(`/rdv?id=${created.id}`);
    } catch (err) {
      const message = err.status === 409 ? "Ce lot n’est plus disponible dans cette quantité." : err.message;
      setError(message);
      notes.push({ tone: "error", title: "Réservation impossible", body: message });
      setPending(false);
    }
  }

  return (
    <Shell>
      <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-6 sm:px-6">
        <PageHeader eyebrow="Réservation" title="Finaliser la commande" />
        {error && <p className="rounded-xl bg-error-container px-4 py-3 font-body-sm text-on-error-container">{error}</p>}
        {!id && (
          <section className="rounded-2xl border border-[#e2e8f0] bg-surface-container-lowest p-5">
            <p className="font-body-md text-on-surface-variant">Choisis un lot sur le marché. Son prix, sa quantité et son quartier s’affichent ici avant l’envoi.</p>
            <Link to="/marche" className="mt-4 inline-flex h-12 items-center rounded-xl bg-primary px-5 font-label-md text-on-primary">Voir les lots</Link>
          </section>
        )}
        {id && loading && <p className="font-body-md text-on-surface-variant">Chargement du lot…</p>}
        {id && missing && !loading && (
          <section className="rounded-2xl border border-[#e2e8f0] bg-surface-container-lowest p-5">
            <p className="font-body-md text-on-surface-variant">Ce lot n’est plus en vente.</p>
            <Link to="/marche" className="mt-4 inline-flex h-12 items-center rounded-xl bg-primary px-5 font-label-md text-on-primary">Retour au marché</Link>
          </section>
        )}
        {lot && (
          <section className="grid gap-4 rounded-2xl border border-[#e2e8f0] bg-surface-container-lowest p-4 sm:grid-cols-[180px_1fr]">
            {lot.image_url ? (
              <img src={lot.image_url} alt="" className="aspect-[4/3] w-full rounded-xl object-cover" />
            ) : (
              <span className="flex aspect-[4/3] items-center justify-center rounded-xl bg-primary-fixed text-primary">
                <span className="material-symbols-outlined text-[36px]">nutrition</span>
              </span>
            )}
            <div className="flex flex-col gap-2">
              <h2 className="font-headline-sm font-bold text-on-surface">{lot.product}</h2>
              <p className="font-body-sm text-on-surface-variant">{lot.quarter} · {lot.adresse_collecte}</p>
              <p className="font-body-sm text-on-surface-variant">{remainText(lot)} restantes · {available} {lot.unit} en vente</p>
              <p className="font-label-md text-primary">{money(unitPrice)} / {lot.unit}</p>
            </div>
            <div className="flex flex-col gap-3 sm:col-span-2">
              <div className="flex items-center justify-between gap-3 rounded-xl bg-surface-container-low p-3">
                <label htmlFor="reservation-qty" className="flex flex-col">
                  <span className="font-label-md">Quantité</span>
                  <span className="font-body-sm text-on-surface-variant">Maximum {available} {lot.unit}</span>
                </label>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => stepQty(-1)} disabled={asked <= 1} className="h-10 w-10 rounded-lg bg-white font-bold text-primary disabled:opacity-40" aria-label="Diminuer">-</button>
                  <input
                    id="reservation-qty"
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    value={draft ?? String(asked)}
                    onChange={typeQty}
                    onFocus={(event) => event.target.select()}
                    onBlur={() => setDraft(null)}
                    className="h-10 w-16 rounded-lg border-[1.5px] border-[#e2e8f0] bg-white text-center font-headline-sm font-bold text-primary"
                  />
                  <span className="font-body-sm text-on-surface-variant">{lot.unit}</span>
                  <button type="button" onClick={() => stepQty(1)} disabled={asked >= available} className="h-10 w-10 rounded-lg bg-white font-bold text-primary disabled:opacity-40" aria-label="Augmenter">+</button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-label-md text-on-surface-variant">Montant au retrait</span>
                <span className="font-headline-sm font-bold text-primary">{money(total)}</span>
              </div>
              <p className="font-body-sm text-on-surface-variant">La quantité est bloquée 20 minutes. Le producteur valide, puis envoie le point de collecte. Le règlement se fait au retrait.</p>
              <button type="button" onClick={confirm} disabled={pending || available < 1 || !ready || draft === ""} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary font-label-lg text-on-primary disabled:opacity-60">
                <span className="material-symbols-outlined">lock</span>
                {available < 1 ? "Lot indisponible" : !user ? "Se connecter pour réserver" : pending ? "Envoi…" : "Confirmer la réservation"}
              </button>
            </div>
          </section>
        )}
      </div>
    </Shell>
  );
}
