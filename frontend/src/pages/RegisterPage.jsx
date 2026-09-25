import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Logo from "../components/Logo.jsx";

const quarters = ["Assigamé", "Hedzranawoé", "Port de pêche", "Bè", "Agoè", "Déckon", "Hanoukopé", "Tokoin"];

export default function RegisterPage() {
  const navigate = useNavigate();
  const [role, setRole] = useState("buyer");

  function onSubmit(event) {
    event.preventDefault();
    navigate(role === "seller" ? "/scan" : "/marche");
  }

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <form onSubmit={onSubmit} className="max-w-lg mx-auto bg-surface-container-lowest rounded-2xl border border-[#e2e8f0] p-6 flex flex-col gap-4 shadow-[0_2px_8px_-2px_rgba(30,82,63,0.08)]">
        <Link to="/" className="inline-flex"><Logo /></Link>
        <h1 className="font-headline-lg text-headline-lg">Créer le compte</h1>
        <p className="font-body-md text-on-surface-variant">Un utilisateur, un seul rôle. Il reste fixé après l’inscription.</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            ["seller", "storefront", "Vendeur", "Déclarer un stock en souffrance"],
            ["buyer", "shopping_bag", "Acheteur", "Réserver dans mon rayon"],
          ].map(([id, icon, title, text]) => (
            <button
              key={id}
              type="button"
              onClick={() => setRole(id)}
              className={`text-left rounded-xl p-3 border ${role === id ? "bg-primary-container text-on-primary border-primary-container" : "bg-surface border-[#e2e8f0] text-on-surface"}`}
            >
              <span className="material-symbols-outlined">{icon}</span>
              <div className="font-label-lg mt-1">{title}</div>
              <div className={`font-body-sm text-body-sm ${role === id ? "text-primary-fixed" : "text-on-surface-variant"}`}>{text}</div>
            </button>
          ))}
        </div>
        <label className="flex flex-col gap-1 font-label-md">Nom
          <input required name="name" className="h-12 rounded-xl border-[1.5px] border-[#e2e8f0] px-3" placeholder="Afi Mensah" />
        </label>
        <label className="flex flex-col gap-1 font-label-md">Email
          <input required type="email" name="email" className="h-12 rounded-xl border-[1.5px] border-[#e2e8f0] px-3" placeholder="afi@marche.tg" />
        </label>
        <label className="flex flex-col gap-1 font-label-md">Mot de passe
          <input required type="password" minLength={8} name="password" className="h-12 rounded-xl border-[1.5px] border-[#e2e8f0] px-3" placeholder="8 caractères minimum" />
        </label>
        <label className="flex flex-col gap-1 font-label-md">Quartier
          <select name="quarter" className="h-12 rounded-xl border-[1.5px] border-[#e2e8f0] px-3 bg-surface">
            {quarters.map((q) => <option key={q}>{q}</option>)}
          </select>
        </label>
        {role === "buyer" ? (
          <label className="flex flex-col gap-1 font-label-md">Type d’acheteur
            <select name="buyerType" className="h-12 rounded-xl border-[1.5px] border-[#e2e8f0] px-3 bg-surface">
              <option>Restaurateur / maquis</option>
              <option>Cantine</option>
              <option>Ménage</option>
              <option>Transformateur</option>
            </select>
          </label>
        ) : (
          <label className="flex flex-col gap-1 font-label-md">Alias Mobile Money
            <input name="momo" className="h-12 rounded-xl border-[1.5px] border-[#e2e8f0] px-3" placeholder="Flooz • Afi M." />
          </label>
        )}
        <button type="submit" className="h-12 rounded-xl bg-primary text-on-primary font-label-lg">
          {role === "seller" ? "Publier mon premier lot" : "Voir les offres près de moi"}
        </button>
        <p className="font-body-sm text-on-surface-variant">Déjà inscrit ? <Link className="text-primary font-bold" to="/connexion">Connexion</Link></p>
      </form>
    </div>
  );
}
