import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext.jsx";
import Shell from "./components/Shell.jsx";
import HomePage from "./pages/HomePage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import MarchePage from "./pages/MarchePage.jsx";
import ScanPage from "./pages/ScanPage.jsx";
import LotPage from "./pages/LotPage.jsx";
import ConfirmPage from "./pages/ConfirmPage.jsx";
import LotsPage from "./pages/LotsPage.jsx";
import DemandesPage from "./pages/DemandesPage.jsx";
import AlertesPage from "./pages/AlertesPage.jsx";
import ProfilPage from "./pages/ProfilPage.jsx";
import ImpactPage from "./pages/ImpactPage.jsx";

function Guard({ children, role }) {
  const { ready, isAuth, isSeller, isBuyer } = useAuth();
  const loc = useLocation();
  if (!ready) {
    return (
      <div className="min-h-screen grid place-items-center bg-background text-on-surface-variant font-label-md">
        Chargement…
      </div>
    );
  }
  if (!isAuth) {
    return <Navigate to="/connexion" replace state={{ from: loc.pathname }} />;
  }
  if (role === "seller" && !isSeller) return <Navigate to="/marche" replace />;
  if (role === "buyer" && !isBuyer) return <Navigate to="/lots" replace />;
  return children;
}

function Guest({ children }) {
  const { ready, isAuth, isSeller } = useAuth();
  if (!ready) return null;
  if (isAuth) return <Navigate to={isSeller ? "/lots" : "/marche"} replace />;
  return children;
}

function Layout({ children }) {
  return <Shell>{children}</Shell>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route
        path="/connexion"
        element={
          <Guest>
            <LoginPage />
          </Guest>
        }
      />
      <Route
        path="/inscription"
        element={
          <Guest>
            <RegisterPage />
          </Guest>
        }
      />
      <Route
        path="/marche"
        element={
          <Guard role="buyer">
            <Layout>
              <MarchePage />
            </Layout>
          </Guard>
        }
      />
      <Route
        path="/lots/:id"
        element={
          <Guard>
            <Layout>
              <LotPage />
            </Layout>
          </Guard>
        }
      />
      <Route
        path="/reservations/:id"
        element={
          <Guard>
            <Layout>
              <ConfirmPage />
            </Layout>
          </Guard>
        }
      />
      <Route
        path="/scan"
        element={
          <Guard role="seller">
            <Layout>
              <ScanPage />
            </Layout>
          </Guard>
        }
      />
      <Route
        path="/lots"
        element={
          <Guard role="seller">
            <Layout>
              <LotsPage />
            </Layout>
          </Guard>
        }
      />
      <Route
        path="/demandes"
        element={
          <Guard role="seller">
            <Layout>
              <DemandesPage />
            </Layout>
          </Guard>
        }
      />
      <Route
        path="/alertes"
        element={
          <Guard role="buyer">
            <Layout>
              <AlertesPage />
            </Layout>
          </Guard>
        }
      />
      <Route
        path="/impact"
        element={
          <Guard>
            <Layout>
              <ImpactPage />
            </Layout>
          </Guard>
        }
      />
      <Route
        path="/profil"
        element={
          <Guard>
            <Layout>
              <ProfilPage />
            </Layout>
          </Guard>
        }
      />
      <Route path="/reservation" element={<Navigate to="/marche" replace />} />
      <Route path="/rdv" element={<Navigate to="/impact" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
