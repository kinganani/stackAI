function urlBase64ToUint8Array(value) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

export function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || Boolean(window.navigator.standalone);
}

export function isIos() {
  const ua = window.navigator.userAgent || "";
  const iPhone = /iPad|iPhone|iPod/.test(ua);
  const iPadOs = window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1;
  return iPhone || iPadOs;
}

export function isSafari() {
  const ua = window.navigator.userAgent || "";
  return /Safari/.test(ua) && !/Chrome|Chromium|Edg|Firefox|Android/.test(ua);
}

export function canUseWebPush() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return false;
  if (isIos() && !isStandalone()) return false;
  return true;
}

export async function registerWorker() {
  if (!("serviceWorker" in navigator)) return null;
  const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  await navigator.serviceWorker.ready;
  return registration;
}

export async function enablePush(api) {
  if (!canUseWebPush()) return { ok: false, reason: "unsupported" };
  const registration = await registerWorker();
  if (!registration) return { ok: false, reason: "unsupported" };
  let permission = Notification.permission;
  if (permission === "default") permission = await Notification.requestPermission();
  if (permission !== "granted") return { ok: false, reason: "denied" };
  const { public_key: key } = await api.pushPublicKey();
  if (!key) return { ok: false, reason: "novapid" };
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(key),
  });
  await api.pushSubscribe(subscription.toJSON());
  return { ok: true };
}
