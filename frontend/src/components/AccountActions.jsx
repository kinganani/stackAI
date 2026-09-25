import { Link } from "react-router-dom";
import { useAuth } from "../auth.jsx";
import { NoteBell } from "../notify.jsx";

export default function AccountActions() {
  const { user, ready } = useAuth();
  if (!ready) return <span className="inline-block h-10 w-28" aria-hidden="true" />;
  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Link to="/connexion" className="inline-flex h-10 items-center rounded-xl px-3 font-label-md text-primary">
          Se connecter
        </Link>
        <Link to="/inscription" className="inline-flex h-10 items-center rounded-xl bg-primary px-3 font-label-md text-on-primary">
          Créer un compte
        </Link>
      </div>
    );
  }
  const initials = String(user.full_name || "LM")
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0] || "")
    .join("")
    .toUpperCase();
  const role = user.role === "seller" ? "Producteur" : "Client";
  return (
    <div className="flex items-center gap-2">
      <NoteBell className="inline-flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-high" />
      <Link to={user.role === "seller" ? "/vendeur" : "/client"} className="flex items-center gap-2">
        <span className="w-8 h-8 rounded-full bg-primary-fixed text-on-primary-fixed flex items-center justify-center font-label-md font-bold">{initials}</span>
        <span className="hidden xl:flex flex-col leading-tight">
          <span className="font-label-md font-bold">{user.full_name}</span>
          <span className="font-body-sm text-body-sm text-on-surface-variant">{role}</span>
        </span>
      </Link>
    </div>
  );
}
