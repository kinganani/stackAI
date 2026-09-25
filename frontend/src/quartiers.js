export const QUARTIERS = [
  { name: "Assigamé", lat: 6.137, lng: 1.222 },
  { name: "Port de Pêche", lat: 6.1378, lng: 1.286 },
  { name: "Adidogomé", lat: 6.19, lng: 1.168 },
  { name: "Agoè", lat: 6.237, lng: 1.2 },
  { name: "Bè", lat: 6.145, lng: 1.248 },
  { name: "Nyékonakpoè", lat: 6.131, lng: 1.215 },
  { name: "Tokoin", lat: 6.17, lng: 1.21 },
  { name: "Kpalimé", lat: 6.9, lng: 0.628 },
];

export const CATEGORIES = [
  { id: "tomate", label: "Tomates" },
  { id: "legume", label: "Légumes (feuilles, gombo…)" },
  { id: "fruit", label: "Fruits de saison" },
  { id: "plantain", label: "Bananes / plantains" },
  { id: "mangue", label: "Mangues" },
  { id: "autre", label: "Autre denrée agricole" },
];

export const PRODUCE_TYPE_FR = {
  fruit: "Fruit",
  legume: "Légume",
};

export function findQuartier(name) {
  return QUARTIERS.find((q) => q.name.toLowerCase() === String(name || "").toLowerCase()) || QUARTIERS[0];
}

export function fmtFcfa(n) {
  return `${Number(n || 0).toLocaleString("fr-FR")} FCFA`;
}

export function statusLabel(status) {
  const map = {
    live: "En vente",
    partial: "Partiel",
    exhausted: "Épuisé",
    cancelled: "Annulé",
    pending_priority: "Prioritaire",
    pending_seller: "En attente vendeur",
    pending_payment: "En attente",
    accepted: "Acceptée",
    expired: "Expirée",
  };
  return map[status] || status;
}
