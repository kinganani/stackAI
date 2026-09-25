import { useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import Logo from "../components/Logo.jsx";
import PlaceFields from "../components/PlaceFields.jsx";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";
import { useNotify } from "../notify.jsx";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user, ready, establish } = useAuth();
  const notes = useNotify();
  const [role, setRole] = useState(params.get("role") === "seller" ? "seller" : "buyer");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setPending(true);
    setError("");
    try {
      const session = await api.register({
        role,
        full_name: String(data.get("name") || ""),
        phone: String(data.get("phone") || ""),
        email: String(data.get("email") || ""),
        password: String(data.get("password") || ""),
        quarter: String(data.get("quarter") || ""),
        lat: Number(data.get("lat")),
        lng: Number(data.get("lng")),
      });
      establish(session);
      notes.push({ tone: "success", title: "Compte créé", body: role === "seller" ? "Tu peux publier un lot." : "Tu peux réserver un lot." });
      navigate(role === "seller" ? "/vendeur" : "/client");
    } catch (err) {
      setError(err.message);
      notes.push({ tone: "error", title: "Inscription impossible", body: err.message });
      setPending(false);
    }
  }

  if (ready && user) {
    return <Navigate to={user.role === "seller" ? "/vendeur" : "/client"} replace />;
  }

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <form onSubmit={onSubmit} className="max-w-lg mx-auto bg-surface-container-lowest rounded-2xl border border-[#e2e8f0] p-6 flex flex-col gap-4 shadow-[0_2px_8px_-2px_rgba(30,82,63,0.08)]">
        <Link to="/" className="inline-flex"><Logo /></Link>
        <h1 className="font-headline-lg text-headline-lg">Créer le compte</h1>
        <p className="font-body-md text-on-surface-variant">Un numéro, un e-mail, et le choix producteur ou client.</p>
        {error && <p className="rounded-xl bg-error-container text-on-error-container px-3 py-2 font-body-sm">{error}</p>}
        <div className="grid grid-cols-2 gap-3">
          {[
            ["seller", "storefront", "Producteur", "Publier un lot avec photo et prix"],
            ["buyer", "shopping_bag", "Client", "Voir les produits les plus proches"],
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
          <input required name="name" defaultValue={params.get("name") || ""} className="h-12 rounded-xl border-[1.5px] border-[#e2e8f0] px-3" placeholder="Ton nom" />
        </label>
        <label className="flex flex-col gap-1 font-label-md">Téléphone
          <input required type="tel" name="phone" defaultValue={params.get("phone") || ""} className="h-12 rounded-xl border-[1.5px] border-[#e2e8f0] px-3" placeholder="90 12 34 56" />
        </label>
        <label className="flex flex-col gap-1 font-label-md">E-mail
          <input required type="email" name="email" className="h-12 rounded-xl border-[1.5px] border-[#e2e8f0] px-3" placeholder="afi@exemple.tg" />
        </label>
        <label className="flex flex-col gap-1 font-label-md">Code d’accès
          <input required type="password" minLength={8} name="password" className="h-12 rounded-xl border-[1.5px] border-[#e2e8f0] px-3" placeholder="8 caractères minimum" />
        </label>
        <PlaceFields />
        <button type="submit" disabled={pending} className="h-12 rounded-xl bg-primary text-on-primary font-label-lg disabled:opacity-60">
          {pending ? "Création…" : "Créer le compte"}
        </button>
        <p className="font-body-sm text-on-surface-variant">Déjà inscrit ? <Link className="text-primary font-bold" to="/connexion">Connexion</Link></p>
      </form>
    </div>
  );
}
