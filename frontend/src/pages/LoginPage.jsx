import { useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import Logo from "../components/Logo.jsx";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";
import { useNotify } from "../notify.jsx";

export default function LoginPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user, ready, establish } = useAuth();
  const notes = useNotify();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setPending(true);
    setError("");
    try {
      const session = await api.login({
        identifiant: String(data.get("identifiant") || ""),
        password: String(data.get("password") || ""),
      });
      establish(session);
      notes.push({ tone: "success", title: "Connexion réussie", body: session.user.full_name || "Compte ouvert." });
      const suite = params.get("suite") || "";
      const safeSuite = suite.startsWith("/") && !suite.startsWith("//") ? suite : "";
      if (session.user.role === "buyer" && safeSuite) navigate(safeSuite);
      else navigate(session.user.role === "seller" ? "/vendeur" : "/client");
    } catch (err) {
      setError(err.message);
      notes.push({ tone: "error", title: "Connexion impossible", body: err.message });
      setPending(false);
    }
  }

  if (ready && user) {
    const suite = params.get("suite") || "";
    const safeSuite = suite.startsWith("/") && !suite.startsWith("//") ? suite : "";
    const home = user.role === "buyer" && safeSuite ? safeSuite : user.role === "seller" ? "/vendeur" : "/client";
    return <Navigate to={home} replace />;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-10">
      <form onSubmit={onSubmit} className="w-full max-w-md bg-surface-container-lowest rounded-2xl border border-[#e2e8f0] shadow-[0_10px_24px_-4px_rgba(30,82,63,0.14)] p-6 flex flex-col gap-4">
        <Link to="/" className="inline-flex"><Logo /></Link>
        <h1 className="font-headline-lg text-headline-lg text-on-surface">Connexion</h1>
        <p className="font-body-md text-on-surface-variant">Entre l’e-mail ou le numéro choisis à l’inscription, puis le code.</p>
        {error && (
          <p className="rounded-xl bg-error-container text-on-error-container px-3 py-2 font-body-sm">{error}</p>
        )}
        <label className="flex flex-col gap-1 font-label-md">
          E-mail ou téléphone
          <input name="identifiant" type="text" required placeholder="afi@exemple.tg" className="h-12 rounded-xl border-[1.5px] border-[#e2e8f0] px-3 font-body-md focus:outline-none focus:ring-2 focus:ring-[#2b7057]" />
        </label>
        <label className="flex flex-col gap-1 font-label-md">
          Code d’accès
          <input name="password" type="password" required minLength={8} placeholder="8 caractères minimum" className="h-12 rounded-xl border-[1.5px] border-[#e2e8f0] px-3 font-body-md focus:outline-none focus:ring-2 focus:ring-[#2b7057]" />
        </label>
        <button type="submit" disabled={pending} className="h-12 rounded-xl bg-primary text-on-primary font-label-lg disabled:opacity-60">
          {pending ? "Connexion…" : "Se connecter"}
        </button>
        <p className="font-body-sm text-on-surface-variant">
          Pas encore de compte ? <Link to="/inscription" className="text-primary font-bold">Créer un compte</Link>
        </p>
      </form>
    </div>
  );
}
