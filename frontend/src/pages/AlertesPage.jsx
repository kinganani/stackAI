import { Link } from "react-router-dom";
import Shell from "../components/Shell.jsx";

const items = [
  { icon: "near_me", title: "Offre dans votre rayon", text: "15 cageots de tomates à 1,2 km • score 0,86", to: "/reservation", tone: "text-primary" },
  { icon: "timer", title: "Fenêtre priorité", text: "Vous êtes dans le top 3. Il reste 6 min pour réserver avant les autres.", to: "/reservation", tone: "text-secondary" },
  { icon: "lock_open", title: "Stock relâché", text: "Le timer de la dorade est écoulé. Le lot est de nouveau visible.", to: "/marche", tone: "text-tertiary-container" },
];

export default function AlertesPage() {
  return (
    <Shell>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-3">
        <h1 className="font-headline-lg text-headline-lg text-primary">Alertes</h1>
        <p className="font-body-md text-on-surface-variant">Ce qui entre dans le rayon, ce qui expire, ce qui se libère.</p>
        {items.map((item) => (
          <Link key={item.title} to={item.to} className="rounded-2xl bg-surface-container-lowest border border-[#e2e8f0] p-4 flex gap-3 items-start">
            <span className={`material-symbols-outlined ${item.tone}`}>{item.icon}</span>
            <span>
              <span className="block font-headline-sm font-bold">{item.title}</span>
              <span className="block font-body-sm text-body-sm text-on-surface-variant mt-1">{item.text}</span>
            </span>
          </Link>
        ))}
      </div>
    </Shell>
  );
}
