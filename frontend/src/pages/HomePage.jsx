import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Logo from "../components/Logo.jsx";
import AccountActions from "../components/AccountActions.jsx";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";

const links = [
  { to: "/marche", label: "Marché" },
  { to: "/reservation", label: "Réserver" },
  { to: "/rdv", label: "Collecte" },
  { to: "/impact", label: "Impact" },
];

export default function HomePage() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [role, setRole] = useState("buyer");
  const [lots, setLots] = useState([]);

  useEffect(() => {
    let alive = true;
    api.catalog()
      .then((data) => {
        if (alive) setLots(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (alive) setLots([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  const quarters = [...new Set(lots.map((lot) => lot.quarter).filter(Boolean))];
  const space = user?.role === "seller" ? "/vendeur" : user ? "/client" : "";
  const cards = [
    ["/marche", "storefront", "Marché", lots.length ? `${lots.length} lot${lots.length > 1 ? "s" : ""} en ligne` : "Lots proches"],
    [user?.role === "seller" ? "/vendeur/publier" : "/marche?proche=1", user?.role === "seller" ? "photo_camera" : "search", user?.role === "seller" ? "Publier" : "Chercher", user?.role === "seller" ? "Photo du lot" : "Lots près de nous"],
    [user?.role === "buyer" ? "/client" : user?.role === "seller" ? "/vendeur" : "/connexion?suite=/client", "near_me", "Proximité", "Du plus près"],
    [user?.role === "seller" ? "/vendeur/demandes" : user ? "/rdv" : "/connexion?suite=/rdv", "pin_drop", "Collecte", "Après validation"],
  ];

  function join(event) {
    event.preventDefault();
    if (user) {
      navigate(space);
      return;
    }
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") || "").trim();
    const phone = String(data.get("phone") || "").trim();
    const query = new URLSearchParams({ role });
    if (name) query.set("name", name);
    if (phone) query.set("phone", phone);
    navigate(`/inscription?${query.toString()}`);
  }

  return (
    <div className="min-h-screen bg-white text-on-surface">
      <header className="fixed top-0 inset-x-0 z-50 bg-surface/90 backdrop-blur-md shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="h-16 max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-2 min-w-0">
          <Link to="/" className="flex items-center gap-2 shrink-0 min-w-0">
            <Logo />
          </Link>
          <nav className="hidden lg:flex items-center gap-1 min-w-0 overflow-x-auto">
            {links.map((link) => {
              const active = pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`font-label-lg text-label-lg px-3 py-1.5 rounded-lg transition-colors ${active ? "bg-primary-container text-on-primary" : "text-on-surface-variant hover:text-on-surface"}`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
          <AccountActions />
        </div>
      </header>
      <div className="pt-16 pb-36 lg:pb-10">
        <section className="relative flex min-h-[280px] items-center justify-center bg-primary sm:min-h-[340px]">
          <img
            src="https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&w=1600&q=80"
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-primary/75" />
          <div className="relative px-4 text-center text-on-primary">
            <h1 className="font-headline-xl text-4xl font-extrabold sm:text-5xl">LocalMatch</h1>
            <p className="mt-2 font-label-sm uppercase tracking-[0.2em] text-primary-fixed">Agriculture • Lomé, Togo</p>
            <p className="mt-3 font-body-md text-primary-fixed">{lots.length} lot{lots.length > 1 ? "s" : ""} publié{lots.length > 1 ? "s" : ""} à Lomé</p>
            <Link to="/marche" className="mt-5 inline-flex h-12 items-center rounded-full bg-white px-5 font-label-md font-bold text-primary">Voir le marché</Link>
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl items-stretch justify-center gap-6 px-4 py-14 sm:px-6 lg:grid-cols-2">
          <aside className="flex flex-col justify-center rounded-3xl bg-primary px-8 py-10 text-on-primary shadow-[0_16px_40px_-24px_rgba(0,59,41,0.8)]">
            <h2 className="text-center font-headline-lg text-3xl font-bold">Nous trouver</h2>
            <ul className="mx-auto mt-8 w-full max-w-sm space-y-4 font-body-md">
              <li>
                <Link to="/marche?quartier=Assigamé" className="flex items-center gap-3 rounded-2xl bg-primary-container/60 px-4 py-3">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-primary">
                    <span className="material-symbols-outlined text-[20px]">location_on</span>
                  </span>
                  <span>
                    <span className="block font-label-md">Marché d’Assigamé, Lomé</span>
                    <span className="block font-body-sm text-primary-fixed">Ouvrir les lots de ce quartier</span>
                  </span>
                </Link>
              </li>
              <li>
                <Link to={user?.role === "seller" ? "/vendeur/publier" : "/inscription?role=seller"} className="flex items-center gap-3 rounded-2xl bg-primary-container/60 px-4 py-3">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-primary">
                    <span className="material-symbols-outlined text-[20px]">agriculture</span>
                  </span>
                  <span>
                    <span className="block font-label-md">Producteur</span>
                    <span className="block font-body-sm text-primary-fixed">Publier un lot avec photo</span>
                  </span>
                </Link>
              </li>
              <li>
                <Link to={user?.role === "buyer" ? "/client" : user ? "/marche" : "/inscription?role=buyer"} className="flex items-center gap-3 rounded-2xl bg-primary-container/60 px-4 py-3">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-primary">
                    <span className="material-symbols-outlined text-[20px]">shopping_bag</span>
                  </span>
                  <span>
                    <span className="block font-label-md">Client</span>
                    <span className="block font-body-sm text-primary-fixed">Réserver un lot proche</span>
                  </span>
                </Link>
              </li>
            </ul>
          </aside>

          <div className="rounded-3xl border border-[#e2e8f0] bg-surface-container-lowest p-6 shadow-[0_2px_8px_-2px_rgba(30,82,63,0.08)] sm:p-8">
            <h2 className="text-center font-headline-lg text-3xl font-bold text-primary">{user ? "Ton espace" : "Rejoindre le marché"}</h2>
            <p className="mt-2 text-center font-body-md text-on-surface-variant">{user ? "Le compte est déjà ouvert." : "Le nom et le téléphone ouvrent l’inscription."}</p>
            <div className="mx-auto mt-3 h-0.5 w-16 bg-primary" />
            {user ? (
              <div className="mx-auto mt-8 flex max-w-lg flex-col gap-3">
                <p className="rounded-2xl bg-primary-fixed px-4 py-3 font-label-md text-on-primary-fixed">{user.full_name} · {user.role === "seller" ? "Producteur" : "Client"} · {user.quarter || "Lomé"}</p>
                <Link to={space} className="inline-flex h-12 items-center justify-center rounded-xl bg-primary font-label-lg text-on-primary">Continuer</Link>
              </div>
            ) : (
              <form className="mx-auto mt-8 grid max-w-lg gap-3 sm:grid-cols-2" onSubmit={join}>
                <input name="name" placeholder="Nom" className="h-12 rounded-xl border border-[#e2e8f0] bg-surface px-3 font-body-md outline-none focus:ring-2 focus:ring-primary" />
                <input name="phone" placeholder="Téléphone" className="h-12 rounded-xl border border-[#e2e8f0] bg-surface px-3 font-body-md outline-none focus:ring-2 focus:ring-primary" />
                <select value={role} onChange={(event) => setRole(event.target.value)} className="h-12 rounded-xl border border-[#e2e8f0] bg-surface px-3 font-body-md outline-none sm:col-span-2">
                  <option value="seller">Producteur — je publie un lot</option>
                  <option value="buyer">Client — je cherche près de moi</option>
                </select>
                <button type="submit" className="h-12 rounded-xl bg-primary font-label-lg text-on-primary sm:col-span-2">
                  Continuer
                </button>
              </form>
            )}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-2 sm:px-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-headline-sm font-bold text-primary">Quartiers avec des lots</h2>
            <Link to="/marche" className="font-label-md text-primary">Tout le marché</Link>
          </div>
          <div className="mb-3 flex flex-wrap gap-2">
            {quarters.length === 0 && <p className="font-body-sm text-on-surface-variant">Aucun lot publié pour le moment.</p>}
            {quarters.map((name) => (
              <Link key={name} to={`/marche?quartier=${encodeURIComponent(name)}`} className="inline-flex h-10 items-center rounded-full bg-primary-fixed px-4 font-label-md text-on-primary-fixed">
                {name} ({lots.filter((lot) => lot.quarter === name).length})
              </Link>
            ))}
          </div>
          <div className="h-[340px] overflow-hidden rounded-2xl border border-[#e2e8f0] bg-[#e8eaee]">
            <iframe
              title="Carte Assigamé, Lomé"
              className="h-full w-full border-0 grayscale"
              src="https://www.openstreetmap.org/export/embed.html?bbox=1.193%2C6.118%2C1.253%2C6.158&layer=mapnik&marker=6.1378%2C1.2227"
            />
          </div>
        </section>

        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-3 px-4 py-8 sm:px-6 md:grid-cols-4">
          {cards.map(([to, icon, label, text]) => (
            <Link key={label} to={to} className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-[#e2e8f0] bg-surface-container-lowest px-3 py-4 text-center text-primary">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-primary-fixed">
                <span className="material-symbols-outlined">{icon}</span>
              </span>
              <span className="font-label-md">{label}</span>
              <span className="font-body-sm text-on-surface-variant">{text}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
