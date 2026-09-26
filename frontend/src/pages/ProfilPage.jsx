import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Shell from "../components/Shell.jsx";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";

function initials(name) {
  return String(name || "LM")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function spacedPhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.length !== 8) return phone || "—";
  return digits.replace(/(\d{2})(?=\d)/g, "$1 ").trim();
}

function Fact({ icon, label, value }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-fixed text-primary">
        <span className="material-symbols-outlined text-[22px]">{icon}</span>
      </span>
      <div className="min-w-0">
        <p className="font-label-sm uppercase tracking-wide text-outline">{label}</p>
        <p className="truncate font-label-md font-bold text-on-surface">{value || "—"}</p>
      </div>
    </div>
  );
}

export default function ProfilPage() {
  const { user, ready, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!ready || !user) return undefined;
    let alive = true;
    api.me()
      .then((data) => {
        if (alive) setProfile(data);
      })
      .catch((err) => {
        if (alive) setError(err.message);
      });
    return () => {
      alive = false;
    };
  }, [ready, user]);

  if (!ready) return <Shell><p className="p-6">Chargement du compte…</p></Shell>;
  if (!user) {
    return (
      <Shell>
        <div className="mx-auto max-w-xl px-4 py-10">
          <section className="rounded-2xl border border-[#e2e8f0] bg-surface-container-lowest shadow-sm p-6">
            <p className="font-headline-lg text-headline-lg font-bold text-primary">Profil</p>
            <p className="mt-2 font-body-md text-on-surface-variant">Connecte-toi pour ouvrir l’espace du compte.</p>
            <Link to="/connexion?suite=/profil" className="mt-5 inline-flex h-12 items-center rounded-xl bg-primary px-5 font-label-lg text-on-primary">Connexion</Link>
          </section>
        </div>
      </Shell>
    );
  }

  const shown = profile || user;
  const seller = shown.role === "seller";
  const role = seller ? "Producteur" : "Client";
  const quarter = shown.quarter || "Lomé";
  const shortcuts = seller
    ? [
      { to: "/vendeur", icon: "dashboard", label: "Tableau de bord" },
      { to: "/vendeur/produits", icon: "inventory_2", label: "Mes lots" },
      { to: "/vendeur/demandes", icon: "verified", label: "Demandes à valider" },
    ]
    : [
      { to: "/client", icon: "near_me", label: "Lots proches" },
      { to: "/client/reservations", icon: "shopping_bag", label: "Mes réservations" },
      { to: "/rdv", icon: "route", label: "Collectes" },
    ];

  async function onLogout() {
    await logout();
    navigate("/connexion");
  }

  return (
    <Shell>
      <div className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-6 sm:px-6">
        {error && <p className="rounded-xl bg-error-container px-4 py-3 font-body-sm text-on-error-container">{error}</p>}
        <section className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-surface-container-lowest shadow-sm">
          <div className="h-28 bg-gradient-to-br from-primary via-primary-container to-[#245c46]" />
          <div className="px-5 pb-6">
            <div className="-mt-12 flex h-24 w-24 items-center justify-center rounded-full bg-white text-[28px] font-extrabold text-primary shadow-[0_8px_20px_-10px_rgba(0,59,41,0.6)] ring-4 ring-white">
              {initials(shown.full_name)}
            </div>
            <h1 className="mt-3 font-headline-lg text-headline-lg text-primary">{shown.full_name || "Compte"}</h1>
            <p className="mt-1 font-body-md text-on-surface-variant">{role} à {quarter}, Lomé</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-primary-fixed px-3 py-1.5 font-label-sm font-bold text-on-primary-fixed">
                <span className="material-symbols-outlined text-[16px]">{seller ? "agriculture" : "shopping_bag"}</span>
                {role}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-surface-container px-3 py-1.5 font-label-sm font-bold text-on-surface">
                <span className="material-symbols-outlined text-[16px] text-primary">location_on</span>
                {quarter}
              </span>
            </div>
          </div>
        </section>

        <section className="divide-y divide-[#eef2f4] overflow-hidden rounded-2xl border border-[#e2e8f0] bg-surface-container-lowest shadow-sm">
          <Fact icon="call" label="Téléphone" value={spacedPhone(shown.phone)} />
          <Fact icon="mail" label="E-mail" value={shown.email} />
          <Fact icon="pin_drop" label="Quartier" value={`${quarter}, Lomé`} />
          {!seller && shown.radius_km != null && (
            <Fact icon="radar" label="Rayon de recherche" value={`${Number(shown.radius_km)} km autour de ${quarter}`} />
          )}
        </section>

        <section className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-surface-container-lowest shadow-sm">
          <p className="px-4 pb-1 pt-4 font-label-sm uppercase tracking-wide text-outline">Ton espace</p>
          {shortcuts.map((item) => (
            <Link key={item.to} to={item.to} className="flex items-center gap-3 px-4 py-3.5 hover:bg-surface-container-low">
              <span className="material-symbols-outlined text-primary">{item.icon}</span>
              <span className="flex-1 font-label-md font-bold">{item.label}</span>
              <span className="material-symbols-outlined text-outline">chevron_right</span>
            </Link>
          ))}
          <button type="button" onClick={onLogout} className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-[#8c1d18] hover:bg-error-container/40">
            <span className="material-symbols-outlined">logout</span>
            <span className="font-label-md font-bold">Quitter le compte</span>
          </button>
        </section>
      </div>
    </Shell>
  );
}
