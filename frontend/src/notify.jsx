import { createContext, useContext, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "./api.js";
import { useAuth } from "./auth.jsx";

const NotifyContext = createContext(null);
const STORE = "lm_notes";

function readStore() {
  try {
    const rows = JSON.parse(sessionStorage.getItem(STORE) || "[]");
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

function writeStore(rows) {
  sessionStorage.setItem(STORE, JSON.stringify(rows.slice(0, 30)));
}

const READ_STORE = "lm_notes_read";

// Le titre fait partie de la clé : « 1 demande » puis « 2 demandes » redevient non lu.
function readKey(item) {
  return `${item.id}|${item.title}`;
}

function readReadStore() {
  try {
    const rows = JSON.parse(localStorage.getItem(READ_STORE) || "[]");
    return new Set(Array.isArray(rows) ? rows : []);
  } catch {
    return new Set();
  }
}

function writeReadStore(keys) {
  try {
    localStorage.setItem(READ_STORE, JSON.stringify([...keys].slice(-100)));
  } catch {
    /* stockage indisponible */
  }
}

const toneClass = {
  success: "bg-[#003b29] text-white",
  warning: "bg-[#a73918] text-white",
  error: "bg-[#8c1d18] text-white",
  info: "bg-[#1e523f] text-white",
};

export function NotifyProvider({ children }) {
  const { user, ready } = useAuth();
  const [inbox, setInbox] = useState(readStore);
  const [readKeys, setReadKeys] = useState(readReadStore);
  const [toasts, setToasts] = useState([]);
  const seen = useRef(new Set(readStore().map((row) => row.id)));

  function remember(next) {
    writeStore(next);
    return next;
  }

  function showToast(item) {
    setToasts((current) => [item, ...current.filter((row) => row.id !== item.id)].slice(0, 3));
    window.setTimeout(() => {
      setToasts((current) => current.filter((row) => row.id !== item.id));
    }, item.tone === "error" ? 7000 : 4500);
  }

  function push(note) {
    const item = {
      id: note.id || `note-${Date.now()}`,
      tone: note.tone || "info",
      title: note.title,
      body: note.body || "",
      href: note.href || "",
    };
    const fresh = !seen.current.has(item.id);
    seen.current.add(item.id);
    if (note.keep) {
      setInbox((current) => remember([item, ...current.filter((row) => row.id !== item.id)]));
    }
    if (fresh || !note.keep) showToast(item);
    return item.id;
  }

  function release(id) {
    setInbox((current) => {
      if (!current.some((row) => row.id === id)) return current;
      seen.current.delete(id);
      return remember(current.filter((row) => row.id !== id));
    });
    setToasts((current) => current.filter((row) => row.id !== id));
  }

  function replaceGroup(prefix, items) {
    items.forEach((item) => {
      if (!seen.current.has(item.id)) {
        seen.current.add(item.id);
        showToast(item);
      }
    });
    setInbox((current) => {
      const kept = current.filter((row) => !String(row.id).startsWith(prefix));
      const known = new Set(items.map((item) => item.id));
      current.filter((row) => String(row.id).startsWith(prefix) && !known.has(row.id)).forEach((row) => seen.current.delete(row.id));
      return remember([...items, ...kept]);
    });
  }

  useEffect(() => {
    if (!ready || !user) return undefined;
    let alive = true;
    async function pull() {
      try {
        const rows = await api.myReservations();
        if (!alive || !Array.isArray(rows)) return;
        const pending = rows.filter((row) => row.status === "pending_payment" || row.status === "pending_priority");
        const accepted = rows.filter((row) => row.status === "accepted");
        const items = [];
        if (user.role === "seller" && pending.length > 0) {
          items.push({
            id: "live:pending",
            tone: "warning",
            title: pending.length > 1 ? `${pending.length} demandes à valider` : "1 demande à valider",
            body: "La validation envoie ton point de collecte.",
            href: "/vendeur/demandes",
          });
        }
        if (user.role === "buyer" && pending.length > 0) {
          items.push({
            id: "live:wait",
            tone: "info",
            title: pending.length > 1 ? `${pending.length} commandes en attente` : "1 commande en attente",
            body: "Le producteur doit encore valider.",
            href: "/rdv",
          });
        }
        if (user.role === "buyer") {
          accepted.slice(0, 3).forEach((row) => {
            items.push({
              id: `live:ready:${row.id}`,
              tone: "success",
              title: `Itinéraire prêt · ${row.product}`,
              body: "Choisis le déplacement et lance la collecte.",
              href: `/rdv?id=${row.id}`,
            });
          });
        }
        replaceGroup("live:", items);
      } catch {
        /* une lecture ratée ne fabrique pas de fausse alerte */
      }
    }
    pull();
    const timer = window.setInterval(pull, 20000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [ready, user]);

  function dismissToast(id) {
    setToasts((current) => current.filter((row) => row.id !== id));
  }

  function markAllRead() {
    setReadKeys((current) => {
      const missing = inbox.map(readKey).filter((key) => !current.has(key));
      if (missing.length === 0) return current;
      const next = new Set([...current, ...missing]);
      writeReadStore(next);
      return next;
    });
  }

  const unread = inbox.filter((item) => !readKeys.has(readKey(item))).length;

  return (
    <NotifyContext.Provider value={{ push, release, inbox, unread, markAllRead }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-20 z-[70] flex flex-col items-center gap-2 px-3">
        {toasts.map((item) => (
          <div key={item.id} className={`pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl px-4 py-3 shadow-lg ${toneClass[item.tone] || toneClass.info}`}>
            <span className="material-symbols-outlined text-[22px]">{item.tone === "error" ? "error" : item.tone === "success" ? "check_circle" : "notifications"}</span>
            <span className="min-w-0 flex-1">
              <span className="block font-label-md font-bold">{item.title}</span>
              {item.body && <span className="mt-0.5 block font-body-sm opacity-90">{item.body}</span>}
              {item.href && <Link to={item.href} className="mt-2 inline-flex font-label-sm underline">Ouvrir</Link>}
            </span>
            <button type="button" onClick={() => dismissToast(item.id)} className="font-label-md" aria-label="Fermer">×</button>
          </div>
        ))}
      </div>
    </NotifyContext.Provider>
  );
}

export function useNotify() {
  const value = useContext(NotifyContext);
  if (!value) throw new Error("Notifications indisponibles.");
  return value;
}

export function NoteBell({ className }) {
  const { unread: count } = useNotify();
  return (
    <Link to="/alertes" className={`relative ${className || ""}`} aria-label="Notifications">
      <span className="material-symbols-outlined text-[22px]">notifications</span>
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-secondary px-1 text-[10px] font-bold leading-none text-on-secondary">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}
