export default function Logo({ hero = false }) {
  return (
    <span className={hero ? "brand-orbit brand-orbit-lg" : "brand-orbit"}>
      <img src="/logo.png" alt="LocalMatch" className={hero ? "brand-logo-photo" : "brand-mark"} />
    </span>
  );
}
