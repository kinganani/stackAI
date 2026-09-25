import Shell from "../components/Shell.jsx";

export default function RdvPage() {
  const maps = "https://maps.google.com/?q=6.137,1.212";
  return (
    <Shell>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-4">
        <p className="font-label-sm uppercase tracking-wide text-secondary">Réservation confirmée • 20 min</p>
        <h1 className="font-headline-lg text-headline-lg text-primary">Point de collecte</h1>
        <section className="rounded-2xl bg-primary text-on-primary p-6">
          <p className="font-label-sm uppercase text-primary-fixed">Adresse du stand</p>
          <p className="mt-2 font-headline-lg text-headline-lg font-bold">Marché d’Assigamé, allée Légumes D4, devant la pharmacie</p>
          <p className="mt-2 text-primary-fixed-dim font-body-md">3 cageots de tomates de Kovié • 25 500 FCFA • à retirer avant la fin du timer</p>
          <a href={maps} target="_blank" rel="noreferrer" className="mt-5 inline-flex h-12 items-center gap-2 px-5 rounded-xl bg-surface text-primary font-label-lg">
            <span className="material-symbols-outlined">map</span>
            Ouvrir dans Google Maps
          </a>
        </section>
        <section className="rounded-2xl bg-surface-container-lowest border border-[#e2e8f0] p-5 grid sm:grid-cols-3 gap-4">
          {[
            ["schedule", "Timer", "18 min 40 s"],
            ["inventory_2", "Quantité lockée", "3 cageots"],
            ["payments", "Montant dû", "25 500 FCFA"],
          ].map(([icon, label, value]) => (
            <div key={label}>
              <span className="material-symbols-outlined text-primary">{icon}</span>
              <p className="font-label-sm text-on-surface-variant mt-1">{label}</p>
              <p className="font-headline-sm font-bold">{value}</p>
            </div>
          ))}
        </section>
        <p className="rounded-xl bg-tertiary-fixed text-on-tertiary-fixed px-4 py-3 font-body-sm">
          Si le timer tombe à zéro, le lock est libéré et le lot redevient réservable.
        </p>
      </div>
    </Shell>
  );
}
