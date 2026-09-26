import { NavLink, useNavigate } from "react-router-dom";
import Logo from "./Logo.jsx";
import BasePageHeader from "./PageHeader.jsx";
import { useAuth } from "../auth.jsx";
import { NoteBell } from "../notify.jsx";

export function PageHeader(props) {
  return (
    <div className="mb-5">
      <BasePageHeader {...props} />
    </div>
  );
}

export function CatalogCard({ title, count, children }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-surface-container-lowest shadow-sm">
      <h2 className="px-4 py-4 font-headline-sm text-headline-sm font-bold text-on-surface sm:px-5">{title} ({count})</h2>
      {children}
    </section>
  );
}

// Sous xl, chaque ligne devient une carte : les cellules portent data-label pour afficher leur intitulé.
export const catalogTable = "block w-full text-left xl:table";
export const catalogHead = "hidden bg-[#f6f8fa] text-[11px] font-bold uppercase tracking-[0.08em] text-[#8b95a1] xl:table-header-group";
export const catalogBody = "block xl:table-row-group";
export const catalogRow = "grid grid-cols-2 gap-x-4 gap-y-3 border-t border-[#eef2f4] px-4 py-4 xl:table-row xl:p-0";
export const catalogCell = "block min-w-0 break-words xl:table-cell xl:px-4 xl:py-3.5 xl:align-middle";
export const catalogLabel = "before:mb-0.5 before:block before:text-[11px] before:font-bold before:uppercase before:tracking-[0.08em] before:text-[#8b95a1] before:content-[attr(data-label)] xl:before:content-none";
export const catalogWide = "col-span-2";

const pillLabel = {
  "Vue d’ensemble": "Accueil",
  "Publier un lot": "Publier",
  "Mes produits": "Produits",
  "Proche de moi": "Proche",
  Réservations: "Réserv.",
};

export default function DashboardLayout({ groups, children }) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const links = groups.flatMap((group) => group.links);

  async function onLogout() {
    await logout();
    navigate("/connexion");
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background text-on-surface">
      <aside className="hidden h-full w-[268px] shrink-0 flex-col overflow-y-auto bg-primary text-on-primary md:flex">
        <div className="flex items-center gap-2 px-5 pb-1 pt-5">
          <span className="material-symbols-outlined text-[22px]">eco</span>
          <span className="text-[15px] font-extrabold tracking-[0.16em]">LOCALMATCH</span>
        </div>
        <NavLink to="/" className="mx-5 mb-6 mt-3 flex items-center justify-center rounded-[28px] bg-white px-5 py-6" aria-label="Page d’accueil LocalMatch" end>
          <img src="/logo.png" alt="LocalMatch" className="sidebar-logo-mark" />
        </NavLink>
        <nav className="flex-1 px-4 pb-6">
          {groups.map((group) => (
            <div key={group.label} className="mb-5">
              <p className="mb-2 px-3 font-label-sm uppercase tracking-[0.16em] text-primary-fixed">{group.label}</p>
              <div className="flex flex-col gap-1">
                {group.links.map((link) => (
                  <SideLink key={link.to} link={link} />
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="px-4 pb-5">
          <NavLink to="/profil" className="flex items-center gap-3 rounded-xl px-3 py-2.5 font-label-md text-primary-fixed hover:bg-white/10">
            <span className="material-symbols-outlined text-[20px]">person</span>
            Profil
          </NavLink>
          <button type="button" onClick={onLogout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left font-label-md text-primary-fixed hover:bg-white/10">
            <span className="material-symbols-outlined text-[20px]">logout</span>
            Quitter
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className="z-40 border-b border-black/5 bg-surface/90 backdrop-blur-md md:hidden"
          style={{ paddingTop: "max(0.25rem, env(safe-area-inset-top))" }}
        >
          <div className="flex h-16 items-center justify-between gap-2 px-4">
            <NavLink to="/" className="inline-flex min-w-0 items-center" aria-label="Page d’accueil LocalMatch" end>
              <Logo />
            </NavLink>
            <div className="flex items-center gap-1">
              <NoteBell className="inline-flex h-11 w-11 items-center justify-center rounded-full text-on-surface-variant" />
              <button type="button" onClick={onLogout} className="flex h-11 w-11 items-center justify-center rounded-full text-on-surface-variant" aria-label="Quitter">
                <span className="material-symbols-outlined text-[22px]">logout</span>
              </button>
            </div>
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto px-4 py-5 pb-36 sm:px-6 md:px-8 md:pb-6">{children}</main>
      </div>

      <MobileDock links={links} />
    </div>
  );
}

function SideLink({ link }) {
  return (
    <NavLink
      to={link.to}
      end={link.end}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-xl px-3 py-2.5 font-label-md ${isActive ? "bg-primary-container text-white" : "text-primary-fixed hover:bg-white/10"}`
      }
    >
      <span className="material-symbols-outlined text-[20px]">{link.icon}</span>
      {link.label}
    </NavLink>
  );
}

function MobileDock({ links }) {
  const fab = links.find((link) => link.icon === "add") || null;
  const rest = links.filter((link) => link !== fab);
  const profil = { to: "/profil", label: "Profil", icon: "person" };
  const items = fab ? rest : [...rest, profil];
  const mid = Math.ceil(items.length / 2);
  const left = items.slice(0, mid);
  const right = fab ? [...items.slice(mid), profil] : items.slice(mid);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 bg-background px-3 pt-8 md:hidden"
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      aria-label="Navigation du tableau de bord"
    >
      <div className="relative mx-auto flex h-[68px] max-w-md items-end justify-between rounded-full bg-white px-1 pb-1.5 shadow-[0_8px_24px_rgba(30,82,63,0.12)]">
        {left.map((link) => (
          <DockItem key={link.to} link={link} />
        ))}
        {fab ? (
          <NavLink
            to={fab.to}
            className="absolute left-1/2 top-0 flex w-14 -translate-x-1/2 -translate-y-[55%] flex-col items-center"
            aria-label={fab.label}
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-container text-on-primary shadow-[0_8px_16px_rgba(30,82,63,0.28)] ring-4 ring-background">
              <span className="material-symbols-outlined text-[26px]">add</span>
            </span>
          </NavLink>
        ) : null}
        {fab ? <span className="w-14 shrink-0" aria-hidden="true" /> : null}
        {right.map((link) => (
          <DockItem key={link.to} link={link} />
        ))}
      </div>
    </nav>
  );
}

function DockItem({ link }) {
  return (
    <NavLink
      to={link.to}
      end={link.end}
      className={({ isActive }) =>
        `flex min-h-[44px] min-w-0 flex-1 flex-col items-center justify-end gap-0.5 pb-0.5 ${isActive ? "text-primary" : "text-outline"}`
      }
    >
      <span className="material-symbols-outlined text-[22px]">{link.icon}</span>
      <span className="max-w-full truncate px-1 text-[11px] font-semibold leading-none">{pillLabel[link.label] || link.label}</span>
    </NavLink>
  );
}
