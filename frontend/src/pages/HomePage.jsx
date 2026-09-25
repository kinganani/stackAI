import { Link } from "react-router-dom";
import Logo from "../components/Logo.jsx";
import { useAuth } from "../AuthContext.jsx";
import { IMAGES } from "../ui.js";

export default function HomePage() {
  const { isAuth, isSeller } = useAuth();
  const next = isAuth ? (isSeller ? "/lots" : "/marche") : "/connexion";

  return (
    <div className="min-h-screen bg-background text-on-surface">
      <header className="fixed top-0 inset-x-0 z-50 bg-surface/90 backdrop-blur-md shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="h-16 max-w-7xl mx-auto px-margin flex items-center justify-between">
          <Link to="/" className="flex items-center gap-space-sm">
            <Logo />
          </Link>
          <div className="flex items-center gap-space-sm">
            <Link to="/connexion" className="hidden sm:inline font-label-lg text-primary px-space-md py-space-xs">
              Connexion
            </Link>
            <Link to="/inscription" className="h-10 px-space-lg rounded-lg bg-secondary text-on-secondary font-label-lg inline-flex items-center">
              Inscription
            </Link>
          </div>
        </div>
      </header>

      <section className="relative pt-16 min-h-[520px] flex items-end">
        <img src={IMAGES.tomate} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/70 to-primary/20" />
        <div className="relative max-w-7xl mx-auto px-margin py-space-2xl w-full">
          <p className="font-label-sm text-primary-fixed uppercase tracking-[0.14em] mb-space-sm">
            Défi 1 · Agriculture & commerce · Lomé
          </p>
          <h1 className="font-headline-xl text-headline-xl text-on-primary max-w-3xl">
            Vendez d’urgence un stock périssable, avant qu’il ne se perde.
          </h1>
          <p className="mt-space-md font-body-lg text-primary-fixed-dim max-w-2xl">
            Déclaration rapide, matching IA dans le rayon, alertes aux acheteurs proches, prix selon la maturité,
            point de collecte sur Maps.
          </p>
          <div className="mt-space-xl flex flex-wrap gap-space-md">
            <Link
              to={isAuth ? next : "/connexion?role=seller"}
              className="h-12 px-space-xl rounded-xl bg-secondary text-on-secondary font-label-lg inline-flex items-center"
            >
              Espace producteur
            </Link>
            <Link
              to={isAuth ? next : "/connexion?role=buyer"}
              className="h-12 px-space-xl rounded-xl bg-surface text-primary font-label-lg inline-flex items-center"
            >
              Marché urgence
            </Link>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-margin py-space-2xl grid sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
        {[
          ["photo_camera", "Déclaration rapide", "Produit, quantité, quartier, expirabilité, photo du lot."],
          ["psychology", "Matching IA", "Score proximité, urgence et volume — calculé côté serveur."],
          ["notifications_active", "Alertes de rayon", "Les 3 meilleurs matchs ont 8 min de priorité."],
          ["map", "Collecte", "Adresse du stand + itinéraire Google Maps."],
        ].map(([icon, title, text]) => (
          <article key={title} className="rounded-xl bg-surface-container-low p-space-lg">
            <span className="material-symbols-outlined text-secondary text-3xl">{icon}</span>
            <h2 className="font-headline-sm mt-space-sm">{title}</h2>
            <p className="font-body-sm text-on-surface-variant mt-space-xs">{text}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
