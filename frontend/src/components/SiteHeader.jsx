import { Link, useLocation } from "react-router-dom";
import Logo from "./Logo.jsx";
import AccountActions from "./AccountActions.jsx";
import { useAuth } from "../auth.jsx";

export default function SiteHeader() {
  const { pathname, search } = useLocation();
  const { user } = useAuth();
  const nearby = pathname === "/marche" && search.includes("proche=1");
  const links = [
    { to: "/marche", label: "Marché", active: pathname === "/marche" && !nearby },
    { to: "/reservation", label: "Réserver", active: pathname === "/reservation" },
    user?.role === "seller"
      ? { to: "/scan", label: "Publier", active: pathname === "/scan" }
      : { to: "/marche?proche=1", label: "Chercher", active: nearby },
    { to: "/rdv", label: "Collecte", active: pathname === "/rdv" },
    { to: "/impact", label: "Impact", active: pathname === "/impact" },
  ];
  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-surface/90 backdrop-blur-md shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
      <div className="h-16 max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-2 min-w-0">
        <Link to="/" className="flex items-center gap-2 shrink-0 min-w-0">
          <Logo />
        </Link>
        <nav className="hidden lg:flex items-center gap-1 min-w-0 overflow-x-auto">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`font-label-lg text-label-lg px-3 py-1.5 rounded-lg transition-colors ${link.active ? "bg-primary-container text-on-primary" : "text-on-surface-variant hover:text-on-surface"}`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <AccountActions />
      </div>
    </header>
  );
}
