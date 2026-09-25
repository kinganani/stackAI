import { Link } from "react-router-dom";
import Logo from "../components/Logo.jsx";

const steps = [
  {
    n: "1",
    to: "/scan",
    title: "Déclarer",
    text: "Photo, quartier, heures restantes. Le lot est en ligne en moins de 30 secondes.",
  },
  {
    n: "2",
    to: "/marche",
    title: "Matcher",
    text: "Seuls les acheteurs dans le rayon voient l’offre, avec un score expliqué.",
  },
  {
    n: "3",
    to: "/rdv",
    title: "Collecter",
    text: "Adresse du stand en grand, lien Maps, timer. Le stock ne part pas deux fois.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background text-on-surface font-body-md">
      <header className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-2">
        <Link to="/" className="flex items-center gap-2 shrink-0 min-w-0">
          <Logo />
        </Link>
        <Link to="/connexion" className="h-11 px-4 rounded-xl bg-primary text-on-primary font-label-lg inline-flex items-center">
          Entrer
        </Link>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pb-16">
        <section className="grid lg:grid-cols-[1.1fr_0.9fr] gap-6 items-stretch py-6 sm:py-10">
          <div className="flex flex-col justify-center">
            <Logo hero />
            <p className="mt-4 font-label-sm uppercase tracking-wide text-secondary">Hackathon • denrées périssables</p>
            <h1 className="mt-3 font-headline-xl text-[32px] sm:text-headline-xl leading-tight text-primary font-extrabold tracking-tight max-w-xl">
              Le stock part avant qu’il ne tourne.
            </h1>
            <p className="mt-4 font-body-lg text-body-lg text-on-surface-variant max-w-xl">
              LocalMatch relie un cageot encore frais à l’acheteur assez proche pour venir le chercher. Le prix suit les heures qui restent.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <Link to="/marche" className="h-12 px-5 rounded-xl bg-primary-container text-on-primary font-label-lg inline-flex items-center justify-center gap-2">
                <span className="material-symbols-outlined">storefront</span>
                Voir les offres près de moi
              </Link>
              <Link to="/scan" className="h-12 px-5 rounded-xl border-[1.5px] border-primary text-primary font-label-lg inline-flex items-center justify-center gap-2">
                <span className="material-symbols-outlined">photo_camera</span>
                Déclarer un lot
              </Link>
            </div>
          </div>

          <aside className="rounded-2xl bg-primary text-on-primary p-6 flex flex-col justify-between min-h-[240px]">
            <div>
              <p className="font-label-sm uppercase tracking-wider text-primary-fixed">Lot en fenêtre</p>
              <p className="mt-2 font-headline-lg text-headline-lg font-extrabold">Tomates de Kovié</p>
              <p className="mt-1 text-primary-fixed font-body-md">Assigamé • 1,2 km • encore 14 h</p>
            </div>
            <div className="mt-6 flex items-end justify-between gap-3">
              <div>
                <p className="font-price-display text-[28px] font-extrabold leading-none">8 500 <span className="text-base font-bold">FCFA</span></p>
                <p className="mt-1 text-primary-fixed line-through font-body-sm">16 000 FCFA</p>
              </div>
              <Link to="/reservation" className="h-12 px-4 rounded-xl bg-surface text-primary font-label-lg inline-flex items-center">
                Réserver
              </Link>
            </div>
          </aside>
        </section>

        <section aria-label="Parcours" className="grid md:grid-cols-3 gap-3">
          {steps.map((step) => (
            <Link
              key={step.n}
              to={step.to}
              className="rounded-2xl bg-surface-container-lowest border border-[#e2e8f0] p-5 min-h-[148px] shadow-[0_2px_8px_-2px_rgba(30,82,63,0.08)] hover:border-primary-container focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary-fixed text-primary font-label-lg">{step.n}</span>
              <h2 className="mt-3 font-headline-sm text-headline-sm font-bold text-primary">{step.title}</h2>
              <p className="mt-1 font-body-md text-on-surface-variant">{step.text}</p>
            </Link>
          ))}
        </section>
      </main>
    </div>
  );
}
