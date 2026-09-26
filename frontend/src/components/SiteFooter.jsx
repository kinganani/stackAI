import { useLocation } from "react-router-dom";

export default function SiteFooter() {
  const { pathname } = useLocation();
  const mobileNav = !(
    pathname === "/connexion"
    || pathname === "/inscription"
    || pathname.startsWith("/vendeur")
    || pathname.startsWith("/client")
    || pathname.startsWith("/acheteur")
  );
  return (
    <footer
      className={`mt-auto border-t border-outline-variant/30 bg-surface-container-low pt-5 ${
        mobileNav
          ? "pb-[max(5.75rem,calc(4.5rem+env(safe-area-inset-bottom)))]"
          : "pb-[max(1.25rem,env(safe-area-inset-bottom))]"
      } lg:pb-7`}
    >
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-center gap-1.5 px-4 text-center sm:px-6">
        <p className="max-w-md text-[15px] font-semibold leading-relaxed tracking-wide text-on-surface sm:text-base">
          Copyright © {new Date().getFullYear()} StackAI || Tous droits réservés.
        </p>
      </div>
    </footer>
  );
}

