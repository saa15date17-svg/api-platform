import { useMemo } from "react";

/* ---------- Area chart (usage trend) ---------- */
export function AreaChart({
  data,
  height = 220,
  stroke = "var(--color-accent)",
  fill = "var(--color-accent)",
}: {
  data: number[];
  height?: number;
  stroke?: string;
  fill?: string;
}) {
  const W = 720;
  const H = height;
  const pad = 8;

  const { line, area, pts } = useMemo(() => {
    if (data.length === 0) return { line: "", area: "", pts: [] as string[] };
    const max = Math.max(...data);
    const min = Math.min(...data);
    const span = max - min || 1;
    const stepX = (W - pad * 2) / (data.length - 1 || 1);
    const pts = data.map((v, i) => {
      const x = pad + i * stepX;
      const y = H - pad - ((v - min) / span) * (H - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    const line = `M ${pts.join(" L ")}`;
    const area = `${line} L ${(pad + (data.length - 1) * stepX).toFixed(1)},${H - pad} L ${pad},${H - pad} Z`;
    return { line, area, pts };
  }, [data, H]);

  const gid = useMemo(() => "g" + Math.random().toString(36).slice(2, 8), []);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none" style={{ height }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fill} stopOpacity="0.20" />
          <stop offset="100%" stopColor={fill} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {pts.length > 0 && (
        <circle cx={pts[pts.length - 1].split(",")[0]} cy={pts[pts.length - 1].split(",")[1]} r="4" fill={stroke} stroke="var(--color-card)" strokeWidth="2" />
      )}
    </svg>
  );
}

/* ---------- Bars ---------- */
export function BarRow({
  label,
  value,
  max,
  display,
  color = "var(--color-accent)",
}: {
  label: string;
  value: number;
  max: number;
  display: string;
  color?: string;
}) {
  const pct = Math.max(2, Math.min(100, (value / (max || 1)) * 100));
  return (
    <div className="flex items-center gap-3">
      <div className="w-36 shrink-0 text-[13px] text-[var(--color-ink-soft)] truncate">{label}</div>
      <div className="flex-1 h-2.5 rounded-full bg-[var(--color-line)] overflow-hidden">
        <div
          className="grow-bar h-full rounded-full"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <div className="w-20 shrink-0 text-right text-[13px] font-semibold tabular-nums">{display}</div>
    </div>
  );
}

/* ---------- Donut ---------- */
export function Donut({
  segments,
  size = 180,
  thickness = 26,
  centerLabel,
  centerSub,
}: {
  segments: { value: number; color: string; label: string }[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerSub?: string;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const r = (size - thickness) / 2;
  const c = size / 2;
  const circ = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="flex items-center gap-6 flex-wrap">
      <svg width={size} height={size} className="shrink-0">
        <circle cx={c} cy={c} r={r} fill="none" stroke="var(--color-line)" strokeWidth={thickness} />
        {segments.map((s, i) => {
          const len = (s.value / total) * circ;
          const el = (
            <circle
              key={i}
              cx={c}
              cy={c}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={thickness}
              strokeDasharray={`${len} ${circ - len}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
              transform={`rotate(-90 ${c} ${c})`}
            />
          );
          offset += len;
          return el;
        })}
        {centerLabel && (
          <text x={c} y={c - 4} textAnchor="middle" className="fill-[var(--color-ink)]" style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 600 }}>
            {centerLabel}
          </text>
        )}
        {centerSub && (
          <text x={c} y={c + 16} textAnchor="middle" className="fill-[var(--color-indigo)]" style={{ fontSize: 11, letterSpacing: 1 }}>
            {centerSub.toUpperCase()}
          </text>
        )}
      </svg>
      <ul className="space-y-2">
        {segments.map((s, i) => (
          <li key={i} className="flex items-center gap-2 text-[13px]">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
            <span className="text-[var(--color-ink-soft)]">{s.label}</span>
            <span className="ml-auto font-semibold tabular-nums">
              {total ? Math.round((s.value / total) * 100) : 0}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------- Sparkline ---------- */
export function Sparkline({ data, color = "var(--color-accent)" }: { data: number[]; color?: string }) {
  const W = 120;
  const H = 32;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const span = max - min || 1;
  const stepX = W / (data.length - 1 || 1);
  const pts = data.map((v, i) => `${8 + i * stepX},${H - 4 - ((v - min) / span) * (H - 8)}`).join(" L ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-[120px] h-[32px]">
      <path d={`M ${pts}`} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
