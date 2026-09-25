import { useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import Logo from "../components/Logo.jsx";
import { api } from "../api.js";
import { useAuth } from "../AuthContext.jsx";
import { IMAGES, fieldClass } from "../ui.js";

export default function LoginPage() {
  const { setSession } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [params] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const seller = params.get("role") === "seller";

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const fd = new FormData(e.currentTarget);
      const data = await api.login({
        email: String(fd.get("email") || email).trim().toLowerCase(),
        password: String(fd.get("password") || password),
      });
      setSession(data);
      const from = loc.state?.from;
      if (from) nav(from, { replace: true });
      else nav(data.profile.role === "seller" ? "/lots" : "/marche", { replace: true });
    } catch (err) {
      setError(err.message || "Connexion impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="relative hidden lg:block">
        <img src={seller ? IMAGES.tomate : IMAGES.fruit} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-primary/75" />
        <div className="relative h-full flex flex-col justify-end p-space-2xl text-on-primary">
          <p className="font-label-sm uppercase tracking-widest text-primary-fixed">LocalMatch · Lomé</p>
          <h1 className="font-headline-lg mt-space-sm">
            {seller ? "Publiez un lot avant la fin de fenêtre." : "Les lots du rayon, scorés pour vous."}
          </h1>
        </div>
      </div>
      <div className="flex items-center justify-center px-margin py-space-2xl">
        <form onSubmit={submit} className="w-full max-w-md">
          <Logo />
          <p className="font-headline-lg text-primary mt-space-lg">Connexion</p>
          <p className="font-body-md text-on-surface-variant mb-space-lg">
            {seller ? "Espace producteur / vendeur" : params.get("role") === "buyer" ? "Espace acheteur" : "Accès LocalMatch"}
          </p>
          {error && <p className="mb-space-md text-error font-body-sm bg-error-container text-on-error-container rounded-xl px-space-md py-space-sm">{error}</p>}
          <label className="font-label-md">Email</label>
          <input name="email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} className={`${fieldClass} mt-space-xs mb-space-md`} />
          <label className="font-label-md">Mot de passe</label>
          <input name="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className={`${fieldClass} mt-space-xs mb-space-lg`} />
          <button disabled={busy} className="w-full h-12 rounded-xl bg-primary text-on-primary font-label-lg disabled:opacity-60">
            {busy ? "Connexion…" : "Entrer"}
          </button>
          <p className="mt-space-md font-body-sm text-on-surface-variant">
            Pas de compte ?{" "}
            <Link className="text-secondary font-bold" to={`/inscription${seller ? "?role=seller" : ""}`}>
              Inscription
            </Link>
          </p>
          <div className="mt-space-lg rounded-xl bg-surface-container-low p-space-md font-body-sm text-on-surface-variant">
            <p className="font-label-md text-on-surface mb-space-xs">Comptes démo</p>
            Producteur <code>afi@localmatch.tg</code>
            <br />
            Acheteur <code>maquis@localmatch.tg</code>
            <br />
            Mot de passe <code>Fraislink1!</code>
          </div>
        </form>
      </div>
    </div>
  );
}
