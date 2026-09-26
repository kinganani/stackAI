import { useState } from "react";

const quarters = ["Assigamé", "Bè", "Tokoin", "Hedzranawoé", "Déckon", "Adidogomé", "Kégué", "Agoè"];

const locationErrors = {
  1: "Autorisation refusée. Autorise la localisation dans les réglages du navigateur (icône à gauche de l’adresse), puis réessaie.",
  2: "Position introuvable : ce navigateur ou cet appareil ne sait pas te localiser. Active la localisation ou essaie un autre navigateur.",
  3: "La recherche de position a pris trop de temps. Réessaie, de préférence à l’extérieur ou près d’une fenêtre.",
};

export default function PlaceFields() {
  const [status, setStatus] = useState("");
  const [coords, setCoords] = useState(null);

  function askLocation() {
    if (!navigator.geolocation) {
      setStatus("Ce téléphone ne partage pas la position.");
      return;
    }
    setStatus("Demande d’autorisation…");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
        setStatus("Position reçue.");
      },
      (error) => setStatus(locationErrors[error.code] || "Position impossible à obtenir. Réessaie."),
      { enableHighAccuracy: true, timeout: 12000 }
    );
  }

  return (
    <>
      <label className="flex flex-col gap-1 font-label-md">Quartier
        <input
          required
          name="quarter"
          list="quartiers-lome"
          className="h-12 rounded-xl border-[1.5px] border-[#e2e8f0] bg-surface px-3"
          placeholder="Choisir ou écrire un quartier de Lomé"
        />
        <datalist id="quartiers-lome">
          {quarters.map((quarter) => <option key={quarter} value={quarter} />)}
        </datalist>
      </label>
      <div className="flex flex-col gap-2">
        <button type="button" onClick={askLocation} className="h-12 rounded-xl border-[1.5px] border-primary px-3 text-left font-label-md text-primary">
          Autoriser ma position en temps réel
        </button>
        <input name="lat" required value={coords ? coords.lat : ""} readOnly className="sr-only" aria-hidden="true" />
        <input name="lng" required value={coords ? coords.lng : ""} readOnly className="sr-only" aria-hidden="true" />
        <p className={`font-body-sm ${coords ? "text-primary" : "text-secondary"}`}>
          {status || "La localisation est obligatoire, comme les autres champs."}
        </p>
      </div>
    </>
  );
}
