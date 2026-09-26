import SiteHeader from "./SiteHeader.jsx";

export default function Shell({ children }) {
  return (
    <div className="min-h-screen bg-background text-on-surface font-body-md flex flex-col">
      <SiteHeader />
      <main className="flex-1 pt-16 pb-24 lg:pb-8">{children}</main>
    </div>
  );
}
