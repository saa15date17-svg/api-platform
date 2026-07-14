import type { CSSProperties } from "react";

export function Avatar({
  name,
  hue = 20,
  size = 36,
}: {
  name: string;
  hue?: number;
  size?: number;
}) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span
      className="inline-grid place-items-center rounded-full font-semibold text-white shrink-0"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        background: `linear-gradient(135deg, hsl(${hue} 55% 45%), hsl(${(hue + 30) % 360} 60% 38%))`,
      } as CSSProperties}
    >
      {initials}
    </span>
  );
}

const ROLE_CLASS: Record<string, string> = {
  owner: "bg-[var(--color-accent-soft)] text-[var(--color-accent)] border-[#f0c9ba]",
  admin: "bg-[var(--color-indigo-soft)] text-[var(--color-indigo)] border-[#c9c9e8]",
  member: "bg-[var(--color-sage-soft)] text-[var(--color-sage)] border-[#cdddcc]",
};

export function RoleBadge({ role }: { role: string }) {
  return (
    <span
      className={`inline-flex items-center text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border ${
        ROLE_CLASS[role] ?? ROLE_CLASS.member
      }`}
    >
      {role}
    </span>
  );
}

const STATUS_STYLE: Record<string, string> = {
  active: "● text-[var(--color-sage)]",
  invited: "● text-[var(--color-accent-2)]",
  suspended: "● text-[var(--color-ink-faint)]",
};

export function StatusDot({ status }: { status: string }) {
  return <span className={STATUS_STYLE[status] ?? STATUS_STYLE.active}>{status}</span>;
}

export function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1) + "k";
  return String(n);
}

export function money(n: number): string {
  return "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

export function timeAgo(date: Date | string): string {
  if (!date) return "never";
  const d = typeof date === "string" ? new Date(date) : date;
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days}d ago`;
  const mo = Math.floor(days / 30);
  return `${mo}mo ago`;
}
