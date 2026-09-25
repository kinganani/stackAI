import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Logo from "../components/Logo.jsx";

export default function LoginPage() {
  const navigate = useNavigate();
  const [error, setError] = useState("");

  function onSubmit(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") || "");
    const password = String(data.get("password") || "");
    if (!email.includes("@") || password.length < 4) {
      setError("Email ou mot de passe incorrect.");
      return;
    }
    navigate("/marche");
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-10">
      <form onSubmit={onSubmit} className="w-full max-w-md bg-surface-container-lowest rounded-2xl border border-[#e2e8f0] shadow-[0_10px_24px_-4px_rgba(30,82,63,0.14)] p-6 flex flex-col gap-4">
        <Link to="/" className="inline-flex"><Logo /></Link>
        <h1 className="font-headline-lg text-headline-lg text-on-surface">Connexion</h1>
        <p className="font-body-md text-on-surface-variant">Pour la démo, entre directement avec un rôle. Le compte ne change pas de rôle ensuite.</p>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => navigate("/scan")} className="h-12 rounded-xl bg-primary-container text-on-primary font-label-md">Vendeur</button>
          <button type="button" onClick={() => navigate("/marche")} className="h-12 rounded-xl border-[1.5px] border-primary text-primary font-label-md">Acheteur</button>
        </div>
        {error && (
          <p className="rounded-xl bg-error-container text-on-error-container px-3 py-2 font-body-sm">{error}</p>
        )}
        <label className="flex flex-col gap-1 font-label-md">
          Email
          <input name="email" type="email" placeholder="afi.mensah@localmatch.tg" className="h-12 rounded-xl border-[1.5px] border-[#e2e8f0] px-3 font-body-md focus:outline-none focus:ring-2 focus:ring-[#2b7057]" />
        </label>
        <label className="flex flex-col gap-1 font-label-md">
          Mot de passe
          <input name="password" type="password" placeholder="••••••••" className="h-12 rounded-xl border-[1.5px] border-[#e2e8f0] px-3 font-body-md focus:outline-none focus:ring-2 focus:ring-[#2b7057]" />
        </label>
        <button type="submit" className="h-12 rounded-xl bg-primary text-on-primary font-label-lg">Entrer sur le marché</button>
        <p className="font-body-sm text-on-surface-variant">
          Pas encore de compte ? <Link to="/inscription" className="text-primary font-bold">Choisir un rôle</Link>
        </p>
      </form>
    </div>
  );
}
