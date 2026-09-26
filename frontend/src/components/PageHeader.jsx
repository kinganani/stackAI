export default function PageHeader({ eyebrow, icon, title, subtitle, children }) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="font-label-sm uppercase tracking-wide text-secondary">{eyebrow}</p>}
        <h1 className="flex items-center gap-2 font-headline-lg text-headline-lg text-primary">
          <span className="min-w-0">{title}</span>
          {icon && <span className="material-symbols-outlined shrink-0 text-[26px] text-primary">{icon}</span>}
        </h1>
        {subtitle && <p className="mt-1 max-w-xl font-body-md text-on-surface-variant">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}
