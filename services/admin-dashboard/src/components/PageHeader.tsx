import type { ReactNode } from "react";

export default function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-8 reveal">
      {eyebrow && (
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--color-accent)] mb-2">
          {eyebrow}
        </p>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <h1 className="font-display text-[34px] md:text-[42px] leading-[1.05] font-semibold tracking-tight text-[var(--color-ink)]">
            {title}
          </h1>
          {description && (
            <p className="mt-3 text-[15px] text-[var(--color-ink-soft)] leading-relaxed">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
