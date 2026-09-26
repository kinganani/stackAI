import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Shell from "../components/Shell.jsx";
import PageHeader from "../components/PageHeader.jsx";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";
import { remainText } from "../ui.js";

const statusLabel = {
  live: "En vente",
  partial: "Partiel",
  expired: "Expiré",
  exhausted: "Épuisé",
  cancelled: "Annulé",
  draft: "Brouillon",
};

export default function LotsPage() {
  const { user } = useAuth();
  const [lots, setLots] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    if (!user || user.role !== "seller") {
      setLots([]);
      setLoading(false);
      return undefined;
    }
    api.myStocks()
      .then((data) => {
        if (alive) setLots(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (alive) setLots([]);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [user]);

  async function cancel(id) {
    await api.cancelStock(id);
    setLots((current) => current.filter((lot) => lot.id !== id));
  }

  return (
    <Shell>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-4">
        <PageHeader eyebrow="Producteur" title="Mes lots">
          <Link to="/vendeur/publier" className="h-12 px-4 rounded-xl bg-primary text-on-primary font-label-lg inline-flex items-center gap-2">
            <span className="material-symbols-outlined">add</span>
            Nouveau lot
          </Link>
        </PageHeader>
        <div className="grid gap-3">
          {lots.map((lot) => (
            <article key={lot.id} className="bg-surface-container-lowest rounded-2xl border border-[#e2e8f0] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-headline-sm text-headline-sm font-bold">{lot.product}</h2>
                  <span className={`px-2 py-0.5 rounded-full font-label-sm ${lot.status === "partial" ? "bg-secondary-fixed text-on-secondary-fixed" : lot.status === "expired" || lot.status === "cancelled" ? "bg-surface-container-high text-outline" : "bg-primary-fixed text-on-primary-fixed"}`}>{statusLabel[lot.status] || lot.status}</span>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">{lot.qty_available} {lot.unit} • {lot.quarter} • {remainText(lot)}</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-price-display text-price-display text-primary font-extrabold">{Number(lot.published_price || 0).toLocaleString("fr-FR")} <span className="font-price-currency">FCFA</span></span>
                {lot.status === "live" || lot.status === "partial" ? (
                  <button type="button" onClick={() => cancel(lot.id)} className="h-10 px-3 rounded-xl border border-secondary text-secondary font-label-md">Annuler</button>
                ) : null}
              </div>
            </article>
          ))}
          {!loading && lots.length === 0 ? (
            <p className="rounded-2xl bg-surface-container-lowest border border-[#e2e8f0] p-4 font-body-md text-on-surface-variant">
              {user && user.role === "seller" ? "Aucun lot publié pour le moment." : "Connecte-toi avec un compte producteur pour voir tes lots."}
            </p>
          ) : null}
        </div>
      </div>
    </Shell>
  );
}
