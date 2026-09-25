import { lotImage } from "../ui.js";

/** Cadre qui s’adapte au cliché (portrait ou paysage) sans le recadrer. */
export default function LotThumb({ lot, className = "", alt }) {
  return (
    <div className={`relative overflow-hidden bg-surface-container-low ${className}`}>
      <img
        src={lotImage(lot)}
        alt={alt || lot?.product_name || "Photo du lot"}
        className="absolute inset-0 h-full w-full object-contain object-center"
      />
    </div>
  );
}
