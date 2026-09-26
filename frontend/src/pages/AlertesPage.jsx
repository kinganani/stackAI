import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Shell from "../components/Shell.jsx";
import PageHeader from "../components/PageHeader.jsx";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";
import { useNotify } from "../notify.jsx";
import { canUseWebPush, enablePush, isIos, isStandalone } from "../pwa.js";

export default function AlertesPage() {
  const { inbox, release, markAllRead } = useNotify();
  const { user } = useAuth();
  const [pushNote, setPushNote] = useState("");
  const [permission, setPermission] = useState(() => (canUseWebPush() ? Notification.permission : "unsupported"));
  const [activated, setActivated] = useState(false);

  useEffect(() => {
    markAllRead();
  }, [inbox]);

  useEffect(() => {
    if (!activated) return undefined;
    const timer = setTimeout(() => setActivated(false), 4000);
    return () => clearTimeout(timer);
  }, [activated]);

  async function activatePush() {
    try {
      const result = await enablePush(api);
      setPermission(Notification.permission);
      if (result.ok) {
        setPushNote("");
        setActivated(true);
      } else if (result.reason === "denied") setPushNote("");
      else setPushNote("Notifications indisponibles sur ce navigateur.");
    } catch {
      setPushNote("Activation impossible pour le moment.");
    }
  }

  return (
    <Shell>
      <div className="mx-auto flex max-w-3xl flex-col gap-3 px-4 py-6 sm:px-6">
        <PageHeader eyebrow="Alertes" title="Notifications" subtitle="Actions en cours : réservation à finaliser, validation du producteur, itinéraire prêt." />
        {user && permission === "default" ? (
          <button type="button" onClick={activatePush} className="h-11 rounded-xl bg-primary px-4 font-label-md text-on-primary">
            Activer les notifications push
          </button>
        ) : user && permission === "denied" ? (
          <p className="rounded-2xl border border-[#e2e8f0] bg-surface-container-lowest p-4 font-body-sm text-on-surface-variant">
            Notifications bloquées sur cet appareil : autorise-les dans les réglages du navigateur (icône à gauche de l’adresse), puis recharge la page.
          </p>
        ) : user && isIos() && !isStandalone() ? (
          <p className="rounded-2xl border border-[#e2e8f0] bg-surface-container-lowest p-4 font-body-sm text-on-surface-variant">
            iPhone : ajoute LocalMatch à l’écran d’accueil, puis ouvre l’icône pour recevoir les push.
          </p>
        ) : null}
        {activated ? <p className="font-body-sm text-primary">Notifications activées sur cet appareil.</p> : null}
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
