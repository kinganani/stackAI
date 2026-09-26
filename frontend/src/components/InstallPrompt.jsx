import { useEffect, useState } from "react";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";
import { canUseWebPush, enablePush, isIos, isSafari, isStandalone, registerWorker } from "../pwa.js";

const INSTALL_KEY = "lm_install_hide";
const PUSH_KEY = "lm_push_hide";

function hiddenRecently(key) {
  try {
    const at = Number(localStorage.getItem(key) || 0);
    return at > Date.now() - 7 * 24 * 3600 * 1000;
  } catch {
    return false;
  }
}

function hide(key) {
  try {
    localStorage.setItem(key, String(Date.now()));
  } catch {
    /* stockage indisponible */
  }
}

export default function InstallPrompt() {
  const { user, ready } = useAuth();
  const [deferred, setDeferred] = useState(null);
  const [showInstall, setShowInstall] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [showPush, setShowPush] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    registerWorker().catch(() => {});
    function onPrompt(event) {
      event.preventDefault();
      setDeferred(event);
      if (!isStandalone() && !hiddenRecently(INSTALL_KEY)) setShowInstall(true);
    }
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", () => {
      setShowInstall(false);
      hide(INSTALL_KEY);
    });
    if (!isStandalone() && !hiddenRecently(INSTALL_KEY)) {
      setShowInstall(true);
    }
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  useEffect(() => {
    if (!ready || !user || !canUseWebPush()) return undefined;
    if (Notification.permission === "granted") {
      enablePush(api).catch(() => {});
      return undefined;
    }
    if (Notification.permission === "default" && !hiddenRecently(PUSH_KEY)) {
      setShowPush(true);
    }
    return undefined;
  }, [ready, user]);

  async function install() {
    if (deferred) {
      setBusy(true);
      deferred.prompt();
      const choice = await deferred.userChoice;
      setBusy(false);
      setDeferred(null);
      if (choice.outcome === "accepted") {
        setShowInstall(false);
        hide(INSTALL_KEY);
      }
      return;
    }
    if (isIos() || isSafari()) {
      setShowIosHelp(true);
      return;
    }
    setShowIosHelp(true);
  }

  async function allowPush() {
    setBusy(true);
    try {
      await enablePush(api);
    } catch {
      /* permission refusée ou VAPID absent */
    }
    setBusy(false);
    setShowPush(false);
    hide(PUSH_KEY);
  }

  if (isStandalone() && !showPush) return null;

  return (
    <>
      {showInstall && !isStandalone() ? (
        <div className="pointer-events-none fixed inset-x-0 z-[80] flex justify-center px-3" style={{ bottom: "max(5.5rem, calc(4.25rem + env(safe-area-inset-bottom)))" }}>
          <div className="pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl bg-[#003b29] px-4 py-3 text-white shadow-lg">
            <img src="/logo.png" alt="LocalMatch" className="mt-0.5 h-11 w-11 rounded-xl bg-white object-contain p-0.5" />
            <span className="min-w-0 flex-1">
              <span className="block font-label-md font-bold">Installer LocalMatch</span>
              <span className="mt-0.5 block font-body-sm text-white/90">Clique pour ajouter l’app sur Windows, Mac, Android ou iPhone. Les alertes suivent ensuite.</span>
              <button type="button" disabled={busy} onClick={install} className="mt-2 inline-flex h-9 items-center rounded-full bg-white px-3 font-label-md font-bold text-[#003b29]">
                {busy ? "Ouverture…" : "Installer"}
              </button>
            </span>
            <button type="button" className="font-label-md" aria-label="Plus tard" onClick={() => { setShowInstall(false); hide(INSTALL_KEY); }}>×</button>
          </div>
        </div>
      ) : null}

      {showPush ? (
        <div className="pointer-events-none fixed inset-x-0 z-[79] flex justify-center px-3" style={{ bottom: showInstall && !isStandalone() ? "max(11.5rem, calc(10rem + env(safe-area-inset-bottom)))" : "max(5.5rem, calc(4.25rem + env(safe-area-inset-bottom)))" }}>
          <div className="pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl bg-[#1e523f] px-4 py-3 text-white shadow-lg">
            <span className="material-symbols-outlined text-[22px]">notifications_active</span>
            <span className="min-w-0 flex-1">
              <span className="block font-label-md font-bold">Activer les notifications</span>
              <span className="mt-0.5 block font-body-sm text-white/90">Demandes de réservation, validation et collecte, même si l’onglet est fermé.</span>
              <button type="button" disabled={busy} onClick={allowPush} className="mt-2 inline-flex h-9 items-center rounded-full bg-white px-3 font-label-md font-bold text-[#1e523f]">
                Autoriser
              </button>
            </span>
            <button type="button" className="font-label-md" aria-label="Plus tard" onClick={() => { setShowPush(false); hide(PUSH_KEY); }}>×</button>
          </div>
        </div>
      ) : null}

      {showIosHelp ? (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={() => setShowIosHelp(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-5 text-on-surface shadow-xl" onClick={(event) => event.stopPropagation()}>
            <p className="font-headline-sm font-bold text-primary">Ajouter LocalMatch à l’écran d’accueil</p>
            {isIos() ? (
              <ol className="mt-3 list-decimal space-y-2 pl-5 font-body-sm text-on-surface-variant">
                <li>Touche le bouton <strong>Partager</strong> (carré avec flèche) en bas de Safari.</li>
                <li>Choisis <strong>Sur l’écran d’accueil</strong>.</li>
                <li>Valide <strong>Ajouter</strong>. Ouvre ensuite l’icône LocalMatch pour les notifications.</li>
              </ol>
            ) : isSafari() ? (
              <ol className="mt-3 list-decimal space-y-2 pl-5 font-body-sm text-on-surface-variant">
                <li>Menu <strong>Fichier</strong> → <strong>Ajouter au Dock</strong>.</li>
                <li>Ou clique l’icône de partage, puis <strong>Ajouter à l’écran d’accueil</strong>.</li>
              </ol>
            ) : (
              <p className="mt-3 font-body-sm text-on-surface-variant">
                Utilise l’icône d’installation dans la barre d’adresse (Chrome, Edge) ou le menu du navigateur : <strong>Installer l’application</strong>.
              </p>
            )}
            <button type="button" onClick={() => { setShowIosHelp(false); hide(INSTALL_KEY); setShowInstall(false); }} className="mt-4 h-11 w-full rounded-xl bg-primary font-label-md text-on-primary">
              Compris
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
