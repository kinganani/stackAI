import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import Logo from "./Logo.jsx";
import { useAuth } from "../AuthContext.jsx";
import { api } from "../api.js";

export default function Shell({ children }) {
  const { profile, isSeller, isBuyer, logout } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!isBuyer) return undefined;
    let stop = false;
    const tick = async () => {
      try {
        const data = await api.alerts();
        if (!stop) setUnread(data.unread || 0);
      } catch {
        /* polling silencieux */
      }
    };
    tick();
    const id = setInterval(tick, 4000);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, [isBuyer, pathname]);

  const links = isSeller
    ? [
        { to: "/scan", label: "Scan IA vendeur" },
        { to: "/lots", label: "Mes lots" },
        { to: "/demandes", label: "Détail & réservations" },
        { to: "/impact", label: "Impact & historique" },
      ]
    : [
        { to: "/marche", label: "Marché urgence" },
        { to: "/alertes", label: "Alertes" },
        { to: "/impact", label: "Impact & historique" },
      ];

  const initials = (profile?.display_name || "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  async function onLogout() {
    await logout();
    navigate("/");
  }

  const mobile = isSeller
    ? [
        { to: "/lots", icon: "inventory_2", label: "Lots" },
        { to: "/demandes", icon: "handshake", label: "Demandes" },
        { to: "/impact", icon: "eco", label: "Impact" },
        { to: "/profil", icon: "person", label: "Profil" },
      ]
    : [
        { to: "/marche", icon: "storefront", label: "Marché" },
        { to: "/alertes", icon: "notifications", label: "Alertes" },
        { to: "/impact", icon: "map", label: "Collecte" },
        { to: "/profil", icon: "person", label: "Profil" },
      ];

  return (
    <div className="min-h-screen bg-background text-on-surface font-body-md flex flex-col">
      <header className="fixed top-0 inset-x-0 z-50 bg-surface/90 backdrop-blur-md shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="h-16 max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-2 min-w-0">
          <Link to={isSeller ? "/lots" : "/marche"} className="flex items-center gap-2 shrink-0 min-w-0">
            <Logo />
          </Link>
          <div className="hidden xl:flex items-center gap-space-xs px-space-md py-space-xs rounded-full max-w-[220px] bg-surface-container text-on-surface">
            <span className="material-symbols-outlined text-primary text-base">location_on</span>
            <span className="font-label-md truncate">Lomé · {profile?.quartier}</span>
          </div>
          <nav className="hidden lg:flex items-center gap-1 min-w-0 overflow-x-auto">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `font-label-lg text-label-lg px-3 py-1.5 rounded-lg transition-colors ${
                    isActive ? "bg-primary-container text-on-primary" : "text-on-surface-variant hover:text-on-surface"
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            {isBuyer && (
              <Link to="/alertes" className="relative p-2 rounded-full text-on-surface-variant hover:bg-surface-container-high" aria-label="Alertes">
                <span className="material-symbols-outlined text-xl">notifications</span>
                {unread > 0 && (
                  <span className="absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full bg-secondary text-on-secondary text-[10px] font-bold flex items-center justify-center">
                    {unread}
                  </span>
                )}
              </Link>
            )}
            <Link to="/profil" className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-primary-fixed text-on-primary-fixed flex items-center justify-center font-label-md font-bold">
                {initials}
              </span>
              <span className="hidden xl:flex flex-col leading-tight">
                <span className="font-label-md font-bold">{profile?.display_name}</span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  {isSeller ? "Grossiste / producteur" : "Acheteur de proximité"}
                </span>
              </span>
            </Link>
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center gap-1 p-2 sm:px-3 sm:py-1.5 rounded-full text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface font-label-md"
              aria-label="Se déconnecter"
            >
              <span className="material-symbols-outlined text-xl">logout</span>
              <span className="hidden sm:inline">Se déconnecter</span>
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1 pt-16 pb-32 lg:pb-8 bg-background">{children}</main>
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-50 pointer-events-none"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        <div className="pointer-events-auto mx-auto mb-2 flex w-[min(92%,24rem)] items-end justify-between rounded-full bg-surface px-2 py-2 shadow-[0_-4px_24px_rgba(18,28,44,0.12)] ring-1 ring-outline-variant/40">
          {mobile.slice(0, 2).map((item) => (
            <DockLink key={item.to} item={item} />
          ))}
          <NavLink
            to={isSeller ? "/scan" : "/marche"}
            className="relative -mt-7 flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary-container text-on-primary shadow-[0_6px_16px_rgba(30,82,63,0.35)]"
            aria-label={isSeller ? "Déclarer un lot" : "Marché"}
          >
            <span className="material-symbols-outlined text-[26px]">{isSeller ? "qr_code_scanner" : "storefront"}</span>
          </NavLink>
          {mobile.slice(2, 4).map((item) => (
            <DockLink key={item.to} item={item} />
          ))}
        </div>
      </nav>
      <footer className="hidden lg:block bg-surface-container-low">
        <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-on-surface-variant">
          <span className="font-label-md text-primary font-bold">LocalMatch • Lomé</span>
          <span className="font-body-sm text-body-sm">Matching IA · photo de fraîcheur · collecte de proximité.</span>
          <span className="font-body-sm text-body-sm">© 2026 LocalMatch</span>
        </div>
      </footer>
    </div>
  );
}

function DockLink({ item }) {
  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        `flex min-w-[3.25rem] flex-col items-center justify-center px-1 py-1 text-[10px] leading-tight ${
          isActive ? "text-primary font-bold" : "text-on-surface-variant"
        }`
      }
    >
      <span className="material-symbols-outlined text-[22px]">{item.icon}</span>
      {item.label}
    </NavLink>
  );
}
