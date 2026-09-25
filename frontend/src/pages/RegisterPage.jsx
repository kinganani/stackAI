import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Logo from "../components/Logo.jsx";
import { api } from "../api.js";
import { useAuth } from "../AuthContext.jsx";
import { QUARTIERS, findQuartier } from "../quartiers.js";
import { IMAGES, fieldClass } from "../ui.js";

export default function RegisterPage() {
  const { setSession } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    password: "",
    password_confirm: "",
    role: params.get("role") === "seller" ? "seller" : "buyer",
    quartier: "Assigamé",
    buyer_type: "household",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const geo = useMemo(() => findQuartier(form.quartier), [form.quartier]);

  function set(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const data = await api.register({ ...form, lat: geo.lat, lng: geo.lng, radius_km: 15 });
      setSession(data);
      nav(data.profile.role === "seller" ? "/scan" : "/marche", { replace: true });
    } catch (err) {
      setError(err.message || "Inscription impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="relative hidden lg:block">
        <img src={IMAGES.mangue} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-primary/70" />
        <div className="relative h-full flex items-end p-space-2xl text-on-primary">
          <h1 className="font-headline-lg">Nom, quartier, téléphone — puis le marché du rayon s’ouvre.</h1>
        </div>
      </div>
      <form onSubmit={submit} className="px-margin py-space-xl max-w-lg mx-auto w-full">
        <Logo />
        <p className="font-headline-lg text-primary mt-space-lg mb-space-md">Créer un compte</p>
        {error && <p className="mb-space-md text-on-error-container bg-error-container rounded-xl px-space-md py-space-sm font-body-sm">{error}</p>}
        <div className="grid grid-cols-2 gap-space-sm mb-space-md">
          <button type="button" onClick={() => set("role", "seller")} className={`h-11 rounded-xl font-label-md ${form.role === "seller" ? "bg-primary text-on-primary" : "bg-surface-container-high"}`}>
            Producteur
          </button>
          <button type="button" onClick={() => set("role", "buyer")} className={`h-11 rounded-xl font-label-md ${form.role === "buyer" ? "bg-primary text-on-primary" : "bg-surface-container-high"}`}>
            Acheteur
          </button>
        </div>
        <div className="grid sm:grid-cols-2 gap-space-md">
          <Field label="Prénom" value={form.first_name} onChange={(v) => set("first_name", v)} />
          <Field label="Nom" value={form.last_name} onChange={(v) => set("last_name", v)} />
        </div>
        <Field label="Email" type="email" value={form.email} onChange={(v) => set("email", v)} />
        <Field label="Téléphone" value={form.phone} onChange={(v) => set("phone", v)} />
        <label className="font-label-md">Quartier</label>
        <select value={form.quartier} onChange={(e) => set("quartier", e.target.value)} className={`${fieldClass} mt-space-xs mb-space-md`}>
          {QUARTIERS.map((q) => (
            <option key={q.name}>{q.name}</option>
          ))}
        </select>
        {form.role === "buyer" && (
          <>
            <label className="font-label-md">Type d’acheteur</label>
            <select value={form.buyer_type} onChange={(e) => set("buyer_type", e.target.value)} className={`${fieldClass} mt-space-xs mb-space-md`}>
              <option value="household">Ménage</option>
              <option value="restaurant">Maquis / restaurant</option>
              <option value="canteen">Cantine</option>
              <option value="processor">Transformateur</option>
            </select>
          </>
        )}
        <Field label="Mot de passe" type="password" value={form.password} onChange={(v) => set("password", v)} />
        <Field label="Confirmation" type="password" value={form.password_confirm} onChange={(v) => set("password_confirm", v)} />
        <button disabled={busy} className="w-full h-12 rounded-xl bg-secondary text-on-secondary font-label-lg mt-space-sm">
          {busy ? "Création…" : "S’inscrire"}
        </button>
        <p className="mt-space-md font-body-sm text-on-surface-variant">
          Déjà inscrit ?{" "}
          <Link className="text-secondary font-bold" to="/connexion">
            Connexion
          </Link>
        </p>
      </form>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }) {
  return (
    <div className="mb-space-md">
      <label className="font-label-md">{label}</label>
      <input type={type} required value={value} onChange={(e) => onChange(e.target.value)} className={`${fieldClass} mt-space-xs`} />
    </div>
  );
}
