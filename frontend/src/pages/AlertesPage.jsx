import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import LotThumb from "../components/LotThumb.jsx";
import { hoursLeftLabel } from "../ui.js";

export default function AlertesPage() {
  const [data, setData] = useState({ unread: 0, results: [] });

  async function load() {
    setData(await api.alerts());
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 4000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-margin py-space-lg">
      <div className="flex justify-between items-end mb-space-lg">
        <div>
          <p className="font-label-sm text-secondary uppercase tracking-widest">Notifications géolocalisées</p>
          <h1 className="font-headline-lg text-primary">Alertes</h1>
        </div>
        {data.unread > 0 && (
          <button type="button" className="font-label-md text-secondary" onClick={() => api.readAllAlerts().then(load)}>
            Tout marquer lu
          </button>
        )}
      </div>
      <div className="flex flex-col gap-space-md">
        {data.results.map((a) =>
          a.kind === "accepted" ? <AcceptedCard key={a.id} alert={a} onRead={() => api.readAlert(a.id).then(load)} /> : (
            <Link
              key={a.id}
              to={`/lots/${a.stock.id}`}
              onClick={() => api.readAlert(a.id)}
              className={`rounded-xl overflow-hidden flex items-stretch ${a.read ? "bg-surface-container-low" : "bg-secondary-fixed"}`}
            >
              <LotThumb lot={a.stock} className="w-28 min-h-[7rem] shrink-0" />
              <div className="p-space-md">
                <p className="font-label-sm text-secondary uppercase">Nouveau lot dans votre rayon</p>
                <p className="font-headline-sm">{a.stock.product_name}</p>
                <p className="font-body-sm">
                  {a.distance_km} km · score {a.score}
                  {a.priority ? " · fenêtre prioritaire 8 min" : ""}
                </p>
                <p className="font-label-sm text-secondary">{hoursLeftLabel(a.stock.hours_left)}</p>
              </div>
            </Link>
          )
        )}
        {data.results.length === 0 && (
          <p className="rounded-xl bg-surface-container-low p-space-lg text-on-surface-variant">
            Aucune alerte. Dès qu’un lot entre dans votre rayon, ou qu’une commande est acceptée, elle apparaît ici.
          </p>
        )}
      </div>
    </div>
  );
}

function AcceptedCard({ alert: a, onRead }) {
  const tel = a.seller_phone ? `tel:+${a.seller_phone}` : null;
  const to = a.reservation_id ? `/reservations/${a.reservation_id}` : `/lots/${a.stock.id}`;
  return (
    <article className={`rounded-xl overflow-hidden ${a.read ? "bg-surface-container-low" : "bg-primary-fixed"}`}>
      <Link to={to} onClick={onRead} className="flex items-stretch">
        <LotThumb lot={a.stock} className="w-28 min-h-[7rem] shrink-0" />
        <div className="p-space-md flex-1">
          <p className="font-label-sm text-primary uppercase">Commande acceptée</p>
          <p className="font-headline-sm">{a.stock.product_name}</p>
          <p className="font-body-sm">
            {a.seller_name} vous attend à {a.adresse_collecte || a.quartier}.
          </p>
        </div>
      </Link>
      <div className="px-space-md pb-space-md flex flex-wrap gap-space-sm">
        {tel && (
          <a href={tel} className="h-11 px-space-md rounded-lg bg-surface-container font-label-md inline-flex items-center gap-1">
            <span className="material-symbols-outlined text-base">call</span>
            {a.seller_phone_display || a.seller_phone}
          </a>
        )}
        <a
          href={a.maps_dir_url || a.maps_url}
          target="_blank"
          rel="noreferrer"
          className="h-11 px-space-md rounded-lg bg-primary text-on-primary font-label-md inline-flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-base">directions</span>
          Suivre l’itinéraire
        </a>
      </div>
    </article>
  );
}
