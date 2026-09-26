import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "./auth.jsx";
import HomePage from "./pages/HomePage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import MarchePage from "./pages/MarchePage.jsx";
import ScanPage from "./pages/ScanPage.jsx";
import ReservationPage from "./pages/ReservationPage.jsx";
import ImpactPage from "./pages/ImpactPage.jsx";
import LotsPage from "./pages/LotsPage.jsx";
import RdvPage from "./pages/RdvPage.jsx";
import AlertesPage from "./pages/AlertesPage.jsx";
import ProfilPage from "./pages/ProfilPage.jsx";
import SellerDashboard from "./pages/SellerDashboard.jsx";
import BuyerDashboard from "./pages/BuyerDashboard.jsx";
import InstallPrompt from "./components/InstallPrompt.jsx";
import SiteFooter from "./components/SiteFooter.jsx";

const leftTabs = [
  { to: "/marche", icon: "storefront", label: "Marché" },
  { to: "/reservation", icon: "shopping_bag", label: "Réserver" },
];
const rightTabs = [
  { to: "/rdv", icon: "pin_drop", label: "Collecte" },
  { to: "/impact", icon: "monitoring", label: "Impact" },
];
function MobileNav() {
  const { pathname, search } = useLocation();
  const { user } = useAuth();
  if (pathname === "/connexion" || pathname === "/inscription" || pathname.startsWith("/vendeur") || pathname.startsWith("/client") || pathname.startsWith("/acheteur")) return null;
  const seller = user?.role === "seller";
  const fab = seller
    ? { to: "/scan", icon: "photo_camera", label: "Publier" }
    : { to: "/marche?proche=1", icon: "search", label: "Chercher" };
  const left = leftTabs;
  const right = rightTabs;
  const fabActive = seller ? pathname === "/scan" : pathname === "/marche" && search.includes("proche=1");
  return (
    <nav
      className="lg:hidden fixed inset-x-0 bottom-0 z-50 bg-background px-3 pt-8"
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      aria-label="Navigation"
    >
      <div className="relative mx-auto flex h-[68px] max-w-md items-end justify-between rounded-full bg-white px-1 pb-1.5 shadow-[0_8px_24px_rgba(30,82,63,0.12)]">
        {left.map((tab) => (
          <NavItem key={tab.to} tab={tab} active={pathname === tab.to && !fabActive} />
        ))}
        <a href={fab.to} className="absolute left-1/2 top-0 flex w-14 -translate-x-1/2 -translate-y-[55%] flex-col items-center" aria-label={fab.label}>
          <span className={`flex h-14 w-14 items-center justify-center rounded-full text-on-primary shadow-[0_8px_16px_rgba(30,82,63,0.28)] ring-4 ring-background ${fabActive ? "bg-primary" : "bg-primary-container"}`}>
            <span className="material-symbols-outlined text-[26px]">{fab.icon}</span>
          </span>
        </a>
        <span className="w-14 shrink-0" aria-hidden="true" />
        {right.map((tab) => (
          <NavItem key={tab.to} tab={tab} active={pathname === tab.to} />
        ))}
      </div>
    </nav>
  );
}

function NavItem({ tab, active }) {
  return (
    <a href={tab.to} className={`flex min-h-[44px] min-w-0 flex-1 flex-col items-center justify-end gap-0.5 pb-0.5 ${active ? "text-primary" : "text-outline"}`}>
      <span className="material-symbols-outlined text-[22px]">{tab.icon}</span>
      <span className="max-w-full truncate px-1 text-[11px] font-semibold leading-none">{tab.label}</span>
    </a>
  );
}

function LegacyClientPath() {
  const { pathname, search } = useLocation();
  return <Navigate to={`${pathname.replace(/^\/acheteur/, "/client")}${search}`} replace />;
}

function RequireAuth({ role, children }) {
  const { user, ready } = useAuth();
  if (!ready) {
    return <p className="p-6 font-body-md text-on-surface-variant">Vérification du compte…</p>;
  }
  if (!user) return <Navigate to="/connexion" replace />;
  if (role && user.role !== role) {
    return <Navigate to={user.role === "seller" ? "/vendeur" : "/client"} replace />;
  }
  return children;
}

export default function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex-1">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/connexion" element={<LoginPage />} />
        <Route path="/inscription" element={<RegisterPage />} />
        <Route path="/marche" element={<MarchePage />} />
        <Route path="/scan" element={<ScanPage />} />
        <Route path="/reservation" element={<ReservationPage />} />
        <Route path="/lots" element={<LotsPage />} />
        <Route path="/rdv" element={<RdvPage />} />
        <Route path="/alertes" element={<AlertesPage />} />
        <Route path="/profil" element={<ProfilPage />} />
        <Route path="/impact" element={<ImpactPage />} />
        <Route path="/vendeur/*" element={<RequireAuth role="seller"><SellerDashboard /></RequireAuth>} />
        <Route path="/client/*" element={<RequireAuth role="buyer"><BuyerDashboard /></RequireAuth>} />
        <Route path="/acheteur/*" element={<LegacyClientPath />} />
      </Routes>
      </div>
      <SiteFooter />
      <InstallPrompt />
      <MobileNav />
    </div>
  );
}
