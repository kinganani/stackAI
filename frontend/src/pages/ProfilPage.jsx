import { useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext.jsx";

export default function ProfilPage() {
  const { profile, logout, isSeller } = useAuth();
  const nav = useNavigate();

  return (
    <div className="max-w-lg mx-auto px-margin py-space-xl">
      <p className="font-label-sm text-secondary uppercase tracking-widest">Compte</p>
      <h1 className="font-headline-lg text-primary mb-space-lg">Profil</h1>
      <div className="rounded-xl bg-surface-container-lowest p-space-lg shadow-sm">
        <div className="flex items-center gap-space-md mb-space-lg">
          <span className="w-14 h-14 rounded-full bg-primary-fixed text-on-primary-fixed flex items-center justify-center font-headline-sm">
            {(profile?.display_name || "?")
              .split(" ")
              .map((p) => p[0])
              .slice(0, 2)
              .join("")
              .toUpperCase()}
          </span>
          <div>
            <p className="font-headline-sm">{profile?.display_name}</p>
            <p className="font-body-sm text-on-surface-variant">{isSeller ? "Producteur / vendeur" : "Acheteur"} · {profile?.quartier}</p>
          </div>
        </div>
        <dl className="space-y-2 font-body-md">
          <Row k="Email" v={profile?.email} />
          <Row k="Quartier" v={profile?.quartier} />
          <Row k="Rayon d’action" v={`${profile?.radius_km || 15} km`} />
        </dl>
      </div>
      <button
        type="button"
        onClick={async () => {
          await logout();
          nav("/");
        }}
        className="w-full h-12 mt-space-lg rounded-xl bg-error text-on-error font-label-lg inline-flex items-center justify-center gap-2"
      >
        <span className="material-symbols-outlined">logout</span>
        Se déconnecter
      </button>
    </div>
  );
}

function Row({ k, v }) {
  return (
    <div className="flex justify-between border-b border-outline-variant/40 py-2">
      <dt className="text-on-surface-variant">{k}</dt>
      <dd>{v || "—"}</dd>
    </div>
  );
}
