export const IMAGES = {
  tomate:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuBOqfbcdV4PrSd_etrtXo69FBKNuMerJrr19vHSjkPHM0BNrh3UrADxWOo1vUzeUuWb1uGdjh62b8XLWwJROTG5lZG-qH9du-Tm4qyXOofVzmTDLrdg4gze5h12nUGX50ZsfZt99Bj27EjOyGAuNjOkPtZzjLk9SAbFIXbrTzEUObv8nlTLEBvmzc_idb0CfJTP5Ngytt4q-TCzbhBVryoLggvT-aLLAydcwiXJO6MEgYBF_m95oECaoQ",
  plantain:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuAUNF4LzgO0y-ISRoTSgbvR1uyKjVtks1UAyR1mG_wAvm5TKqY-7fe6eSXb6eY5a0bVrYb6jNdlMIpEEsXtfp2onHNCGImzwuMUAPApAbziQS6u0lUg3SHyNlZqFj9umxMk9MKT2UU7DWirP1kbCzdkw8CVtc9AbTlBLd2lU1bINo8iLz1Y3WeNlSMWFvvmUVWlwHzjzhBTCbAYTF3LVlmJvdhU4FnoQgEXgEsIwcTJkPMfygTWY1676w",
  mangue:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuDWrFCELgb1fsTmIinDhHb-0eFRxcvULY99if4NahtSainGLnBHmCykKIxSX9j-1bCY-2F2aHYmOMcJE6HJlHvbs0KX9z2MZAB0aJTM3wlNaBTxVldfW3vV79m_XZqjnLYAEcHzp3VdNwFkv2XSd9Q4uFHIHbcj7QxL4tM_1oFr5uNPqMcFvuyRrS-Khsf23vSeCbOkfWgYpKg5DHI9jjsKdoBCCIRRZpeFau2tSNxC5X0kiS3_ZtxP9Q",
  autre:
    "https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&w=1200&q=80",
  fruit:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuDWrFCELgb1fsTmIinDhHb-0eFRxcvULY99if4NahtSainGLnBHmCykKIxSX9j-1bCY-2F2aHYmOMcJE6HJlHvbs0KX9z2MZAB0aJTM3wlNaBTxVldfW3vV79m_XZqjnLYAEcHzp3VdNwFkv2XSd9Q4uFHIHbcj7QxL4tM_1oFr5uNPqMcFvuyRrS-Khsf23vSeCbOkfWgYpKg5DHI9jjsKdoBCCIRRZpeFau2tSNxC5X0kiS3_ZtxP9Q",
  legume:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuBOqfbcdV4PrSd_etrtXo69FBKNuMerJrr19vHSjkPHM0BNrh3UrADxWOo1vUzeUuWb1uGdjh62b8XLWwJROTG5lZG-qH9du-Tm4qyXOofVzmTDLrdg4gze5h12nUGX50ZsfZt99Bj27EjOyGAuNjOkPtZzjLk9SAbFIXbrTzEUObv8nlTLEBvmzc_idb0CfJTP5Ngytt4q-TCzbhBVryoLggvT-aLLAydcwiXJO6MEgYBF_m95oECaoQ",
};

export const fieldClass =
  "w-full rounded-xl border-0 bg-surface-container-low px-4 py-3 font-body-md text-on-surface outline-none ring-1 ring-transparent focus:ring-2 focus:ring-primary";

export function lotImage(lot) {
  const url = (lot?.image_url || "").trim();
  if (url) return url;
  return IMAGES[lot?.category] || IMAGES.autre;
}

export function hoursLeftLabel(h) {
  const n = Number(h);
  if (!Number.isFinite(n)) return "—";
  if (n <= 0) return "expiré";
  if (n >= 24) {
    const days = Math.floor(n / 24);
    const rest = Math.round(n - days * 24);
    if (rest >= 1) return `${days} j ${rest} h restantes`;
    return `${days} j restantes`;
  }
  if (n < 1) return `${Math.max(1, Math.round(n * 60))} min restantes`;
  const hr = Math.floor(n);
  const min = Math.round((n - hr) * 60);
  return min ? `${hr} h ${min} min restantes` : `${hr} h restantes`;
}

export function remainText(lot) {
  if (!lot) return "—";
  if (lot.remaining_label) return lot.remaining_label;
  if (lot.hours_label) return lot.hours_label;
  return hoursLeftLabel(lot.hours_left).replace(/ restantes$/, "");
}

export function freshnessTone(score) {
  const s = Number(score) || 0;
  if (s < 40) return "Critique";
  if (s < 70) return "À écouler vite";
  return "Bon état";
}

export function lotIsAvailable(lot) {
  if (!lot) return false;
  if (lot.available === false) return false;
  const qty = Number(lot.qty_available);
  if (!Number.isFinite(qty) || qty < 1) return false;
  return !["exhausted", "expired", "cancelled"].includes(lot.status);
}
