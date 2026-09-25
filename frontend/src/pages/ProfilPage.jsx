import { useState } from "react";
import Shell from "../components/Shell.jsx";

export default function ProfilPage() {
  const [saved, setSaved] = useState(false);
  return (
    <Shell>
      <form
        className="max-w-xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          setSaved(true);
        }}
      >
        <h1 className="font-headline-lg text-headline-lg text-primary">Profil</h1>
        <p className="font-body-md text-on-surface-variant">Rôle acheteur, déjà choisi. Le rayon sert au matching.</p>
        <div className="rounded-xl bg-primary-fixed text-on-primary-fixed px-4 py-3 font-label-lg">Grossiste & transformateur</div>
        <label className="flex flex-col gap-1 font-label-md">Nom
          <input defaultValue="Afi Mensah" className="h-12 rounded-xl border-[1.5px] border-[#e2e8f0] px-3 bg-surface-container-lowest" />
        </label>
        <label className="flex flex-col gap-1 font-label-md">Quartier
          <input defaultValue="Assigamé" className="h-12 rounded-xl border-[1.5px] border-[#e2e8f0] px-3 bg-surface-container-lowest" />
        </label>
        <label className="flex flex-col gap-1 font-label-md">Rayon de collecte (km)
          <input type="number" min="1" max="30" defaultValue="5" className="h-12 rounded-xl border-[1.5px] border-[#e2e8f0] px-3 bg-surface-container-lowest" />
        </label>
        <label className="flex flex-col gap-1 font-label-md">Alias Mobile Money
          <input defaultValue="Flooz • Afi Mensah" className="h-12 rounded-xl border-[1.5px] border-[#e2e8f0] px-3 bg-surface-container-lowest" />
        </label>
        <button type="submit" className="h-12 rounded-xl bg-primary text-on-primary font-label-lg">Enregistrer</button>
        {saved && <p className="font-body-sm text-primary font-bold">Profil enregistré sur cet appareil.</p>}
      </form>
    </Shell>
  );
}
