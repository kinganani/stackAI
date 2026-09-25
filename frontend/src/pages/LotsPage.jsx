import { Link } from "react-router-dom";
import Shell from "../components/Shell.jsx";

const lots = [
  { id: "TG-8824", name: "Tomates de Kovié", qty: "8 cageots", hours: "36 h", price: "14 000", status: "En vente", tone: "bg-primary-fixed text-on-primary-fixed" },
  { id: "TG-7710", name: "Dorades du port", qty: "35 kg", hours: "4 h", price: "42 000", status: "Partiel", tone: "bg-secondary-fixed text-on-secondary-fixed" },
  { id: "TG-6602", name: "Plantains mûrs", qty: "50 kg", hours: "24 h", price: "12 000", status: "En vente", tone: "bg-primary-fixed text-on-primary-fixed" },
  { id: "TG-5401", name: "Mangues Kent", qty: "60 kg", hours: "Expiré", price: "7 500", status: "Expiré", tone: "bg-surface-container-high text-outline" },
];

export default function LotsPage() {
  return (
    <Shell>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-label-sm uppercase tracking-wide text-primary">Vendeur</p>
            <h1 className="font-headline-lg text-headline-lg text-primary">Mes lots</h1>
          </div>
          <Link to="/scan" className="h-12 px-4 rounded-xl bg-primary text-on-primary font-label-lg inline-flex items-center gap-2">
            <span className="material-symbols-outlined">add</span>
            Nouveau lot
          </Link>
        </div>
        <div className="grid gap-3">
          {lots.map((lot) => (
            <article key={lot.id} className="bg-surface-container-lowest rounded-2xl border border-[#e2e8f0] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-headline-sm text-headline-sm font-bold">{lot.name}</h2>
                  <span className={`px-2 py-0.5 rounded-full font-label-sm ${lot.tone}`}>{lot.status}</span>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">Lot #{lot.id} • {lot.qty} • fenêtre {lot.hours}</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-price-display text-price-display text-primary font-extrabold">{lot.price} <span className="font-price-currency">FCFA</span></span>
                <button type="button" className="h-10 px-3 rounded-xl border border-secondary text-secondary font-label-md">Annuler</button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </Shell>
  );
}
