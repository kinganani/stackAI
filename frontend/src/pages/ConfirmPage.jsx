import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api.js";
import { fmtFcfa, statusLabel } from "../quartiers.js";
import { useAuth } from "../AuthContext.jsx";
import { hoursLeftLabel, lotImage } from "../ui.js";

export default function ConfirmPage() {
  const { id } = useParams();
  const { isBuyer } = useAuth();
  const [resa, setResa] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let stop = false;
    const tick = () => {
      api
        .reservation(id)
        .then((data) => {
          if (!stop) setResa(data);
        })
        .catch((err) => {
          if (!stop) setError(err.message);
        });
    };
    tick();
    const timer = setInterval(tick, 4000);
    return () => {
      stop = true;
      clearInterval(timer);
    };
  }, [id]);

  if (!resa && !error) return <p className="px-margin py-space-lg">Chargement…</p>;
  if (!resa) return <p className="px-margin py-space-lg text-error">{error}</p>;

  const lot = resa.stock;
  const until = new Date(resa.reserved_until);
  const hours = Math.max(0, (until.getTime() - Date.now()) / 3600000);
  const dir = resa.maps_dir_url || lot.maps_dir_url || resa.maps_url;
  const embed = resa.maps_embed_url || lot.maps_embed_url;
  const accepted = resa.status === "accepted";

  return (
    <div className="max-w-3xl mx-auto px-margin py-space-lg flex flex-col gap-space-md">
      <p className="font-label-sm uppercase tracking-wide text-secondary">
        {accepted ? "Commande acceptée" : "Réservation bloquée"} · {statusLabel(resa.status)}
      </p>
      <h1 className="font-headline-lg text-primary">Itinéraire vers le vendeur</h1>

      <div className="relative rounded-xl overflow-hidden min-h-40">
        <img src={lotImage(lot)} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-primary/80" />
        <div className="relative p-space-lg text-on-primary">
          <p className="font-label-sm uppercase text-primary-fixed">Adresse du stand</p>
          <p className="mt-space-sm font-headline-md font-bold">{resa.adresse_collecte}</p>
          <p className="mt-space-sm text-primary-fixed-dim">
            {resa.qty} {lot.unit} de {lot.product_name} · {fmtFcfa(resa.amount_due)} · {lot.quartier}
          </p>
        </div>
      </div>

      {embed && (
        <div className="rounded-xl overflow-hidden ring-1 ring-outline-variant/40 min-h-[220px] bg-surface-container-low">
          <iframe
            title="Carte du point de collecte"
            src={embed}
            className="w-full h-[220px] border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      )}

      <div className="rounded-xl bg-surface-container-lowest p-space-lg text-center">
        <p className="font-label-sm text-on-surface-variant uppercase">Code retrait</p>
        <p className="font-headline-xl font-black text-secondary tracking-widest bg-secondary-fixed/50 inline-block px-space-lg py-1 rounded-xl mt-space-xs">
          {resa.pickup_code}
        </p>
        <p className="font-body-sm text-on-surface-variant mt-space-md">
          Présentez ce code à {lot.seller_name}.
        </p>
      </div>

      {isBuyer && (
        <div className="rounded-xl bg-primary-fixed p-space-lg flex flex-col gap-space-md">
          <p className="font-label-sm uppercase text-primary">Se rendre chez le vendeur</p>
          <p className="font-body-md">
            Google Maps ouvre l’itinéraire GPS jusqu’à {resa.adresse_collecte} ({lot.quartier}).
          </p>
          {accepted && resa.seller_phone && (
            <a href={`tel:+${resa.seller_phone}`} className="h-12 rounded-xl bg-surface font-label-lg inline-flex items-center justify-center gap-2">
              <span className="material-symbols-outlined">call</span>
              Appeler {resa.seller_phone_display || resa.seller_phone}
            </a>
          )}
          <a
            href={dir}
            target="_blank"
            rel="noreferrer"
            className="h-12 rounded-xl bg-primary text-on-primary font-label-lg inline-flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined">directions</span>
            Suivre l’itinéraire
          </a>
        </div>
      )}

      {!isBuyer && dir && (
        <a href={dir} target="_blank" rel="noreferrer" className="h-12 rounded-xl bg-primary text-on-primary font-label-lg inline-flex items-center justify-center gap-2">
          <span className="material-symbols-outlined">map</span>
          Voir le stand sur Maps
        </a>
      )}

      <div className="rounded-xl bg-surface-container-lowest border border-outline-variant/40 p-space-md grid sm:grid-cols-3 gap-space-md">
        {[
          ["schedule", "Fenêtre", hoursLeftLabel(hours).replace(" restantes", "")],
          ["inventory_2", "Quantité", `${resa.qty} ${lot.unit}`],
          ["payments", "Montant", fmtFcfa(resa.amount_due)],
        ].map(([icon, label, value]) => (
          <div key={label}>
            <span className="material-symbols-outlined text-primary">{icon}</span>
            <p className="font-label-sm text-on-surface-variant mt-1">{label}</p>
            <p className="font-headline-sm font-bold">{value}</p>
          </div>
        ))}
      </div>

      {!accepted && (
        <p className="rounded-xl bg-tertiary-fixed text-on-tertiary-fixed px-space-md py-space-sm font-body-sm">
          Dès que le producteur accepte, vous pouvez l’appeler. L’itinéraire vers son adresse est déjà disponible.
        </p>
      )}

      <Link to={isBuyer ? "/marche" : "/demandes"} className="text-center font-label-md text-secondary">
        {isBuyer ? "Retour au marché urgence" : "Retour aux demandes"}
      </Link>
    </div>
  );
}
