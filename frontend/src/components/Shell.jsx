import { Link, useLocation } from "react-router-dom";
import Logo from "./Logo.jsx";
import AccountActions from "./AccountActions.jsx";

const links = [
  { to: "/marche", label: "Marché" },
  { to: "/scan", label: "Déclarer" },
  { to: "/reservation", label: "Réserver" },
  { to: "/rdv", label: "Collecte" },
  { to: "/impact", label: "Impact" },
];

export default function Shell({ children }) {
  const { pathname } = useLocation();
  return (
    <div className="min-h-screen bg-background text-on-surface font-body-md flex flex-col">
      <header className="fixed top-0 inset-x-0 z-50 bg-surface/90 backdrop-blur-md shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="h-16 max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-2 min-w-0">
          <Link to="/" className="flex items-center gap-2 shrink-0 min-w-0">
            <Logo />
          </Link>
          <nav className="hidden lg:flex items-center gap-1 min-w-0 overflow-x-auto">
            {links.map((link) => {
              const active = pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`font-label-lg text-label-lg px-3 py-1.5 rounded-lg transition-colors ${active ? "bg-primary-container text-on-primary" : "text-on-surface-variant hover:text-on-surface"}`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
          <AccountActions />
        </div>
      </header>
      <main className="flex-1 pt-16 pb-24 lg:pb-8">{children}</main>
      <footer className="hidden md:block bg-surface-container-low">
        <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-on-surface-variant">
          <span className="font-label-md text-primary font-bold">LocalMatch • Lomé</span>
          <span className="font-body-sm text-body-sm">La denrée part tant qu’elle est encore dans sa fenêtre de vie.</span>
          <span className="font-body-sm text-body-sm">© 2026 LocalMatch</span>
        </div>
      </footer>
    </div>
  );
}
