import { useAuth } from "../auth.jsx";
import { Navigate } from "react-router-dom";

export default function ScanPage() {
  const { user, ready } = useAuth();
  if (!ready) {
    return <p className="p-6 font-body-md text-on-surface-variant">Ouverture du marché…</p>;
  }
  if (user?.role === "seller") {
    return <Navigate to="/vendeur/publier" replace />;
  }
  return <Navigate to="/marche?proche=1" replace />;
}
