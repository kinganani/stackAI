import { useState } from "react";
import { Link } from "react-router-dom";
import Shell from "../components/Shell.jsx";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";
import { useNotify } from "../notify.jsx";
import { canUseWebPush, enablePush, isIos, isStandalone } from "../pwa.js";

export default function AlertesPage() {
  const { inbox, release } = useNotify();
  const { user } = useAuth();
  const [pushNote, setPushNote] = useState("");

  async function activatePush() {
    if (isIos() && !isStandalone()) {
      setPushNote("Sur iPhone, installe d’abord LocalMatch sur l’écran d’accueil, puis rouvre l’app pour autoriser les alertes.");
      return;
    }
    try {
      const result = await enablePush(api);
      if (result.ok) setPushNote("Notifications activées sur cet appareil.");
      else if (result.reason === "denied") setPushNote("Autorise les notifications dans les réglages du navigateur.");
      else setPushNote("Notifications indisponibles sur ce navigateur.");
    } catch {
      setPushNote("Activation impossible pour le moment.");
    }
  }

  return (
    <Shell>
      <div className="mx-auto flex max-w-3xl flex-col gap-3 px-4 py-6 sm:px-6">
        <h1 className="font-headline-lg text-headline-lg text-primary">Notifications</h1>
        <p className="font-body-md text-on-surface-variant">Actions en cours : réservation à finaliser, validation du producteur, itinéraire prêt.</p>
        {user && canUseWebPush() ? (
          <button type="button" onClick={activatePush} className="h-11 rounded-xl bg-primary px-4 font-label-md text-on-primary">
            Activer les notifications push
          </button>
        ) : user && isIos() && !isStandalone() ? (
          <p className="rounded-2xl border border-[#e2e8f0] bg-surface-container-lowest p-4 font-body-sm text-on-surface-variant">
            iPhone : ajoute LocalMatch à l’écran d’accueil, puis ouvre l’icône pour recevoir les push.
          </p>
        ) : null}
        {pushNote ? <p className="font-body-sm text-primary">{pushNote}</p> : null}
        {inbox.map((item) => (
          <article key={item.id} className="flex items-start gap-3 rounded-2xl border border-[#e2e8f0] bg-surface-container-lowest p-4">
            <span className="material-symbols-outlined text-primary">{item.tone === "warning" ? "priority_high" : item.tone === "success" ? "route" : "notifications"}</span>
            <span className="min-w-0 flex-1">
              <span className="block font-label-md font-bold text-on-surface">{item.title}</span>
              {item.body && <span className="mt-1 block font-body-sm text-on-surface-variant">{item.body}</span>}
              {item.href && <Link to={item.href} className="mt-2 inline-flex font-label-md text-primary">Ouvrir</Link>}
            </span>
            <button type="button" onClick={() => release(item.id)} className="font-label-md text-outline" aria-label="Retirer">×</button>
          </article>
        ))}
        {inbox.length === 0 && (
          <p className="rounded-2xl border border-[#e2e8f0] bg-surface-container-lowest p-4 font-body-md text-on-surface-variant">Aucune action en attente.</p>
        )}
      </div>
    </Shell>
  );
}
