import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const NAV = [
  {
    section: "Workspace",
    items: [
      { href: "/dashboard", label: "Overview", glyph: "◴" },
      { href: "/users", label: "Members", glyph: "◷" },
      { href: "/usage", label: "Usage Analytics", glyph: "◵" },
      { href: "/sessions", label: "Conversations", glyph: "❒" },
    ],
  },
  {
    section: "Platform",
    items: [
      { href: "/api-keys", label: "API Keys", glyph: "◈" },
      { href: "/bifrost", label: "AI Gateway (Bifrost)", glyph: "⇄" },
      { href: "/settings", label: "Settings", glyph: "⚙" },
    ],
  },
];

export default function Sidebar() {
  const location = useLocation();
  const { user, signout } = useAuth();
  const pathname = location.pathname;

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((p) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "U";

  const email = user?.email || "";
  const name = user?.name || "User";
  const role = user?.role || "member";

  // Quick string hash to generate a stable hue [0, 360]
  const getHue = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash) % 360;
  };
  const avatarHue = getHue(email);

  return (
    <aside className="hidden md:flex flex-col w-[256px] shrink-0 border-r border-[var(--color-line)] bg-[var(--color-canvas-2)]/60 h-screen sticky top-0">
      <div className="px-5 pt-6 pb-5 border-b border-[var(--color-line)]">
        <Link to="/dashboard" className="flex items-center gap-3 group">
          <span className="grid place-items-center w-9 h-9 rounded-xl bg-[var(--color-ink)] text-[var(--color-accent-2)] font-display text-xl font-semibold shadow-sm group-hover:scale-105 transition-transform">
            Ø
          </span>
          <span className="leading-tight">
            <span className="block font-display text-[19px] font-semibold tracking-tight text-[var(--color-ink)]">
              Optamus
            </span>
            <span className="block text-[11px] uppercase tracking-[0.18em] text-[var(--color-ink-faint)]">
              Console
            </span>
          </span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-7">
        {NAV.map((group) => (
          <div key={group.section}>
            <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-faint)]">
              {group.section}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active =
                  pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <li key={item.href}>
                    <Link
                      to={item.href}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[14px] font-medium transition-colors ${
                        active
                          ? "bg-[var(--color-card)] text-[var(--color-ink)] shadow-sm border border-[var(--color-line)]"
                          : "text-[var(--color-ink-soft)] hover:bg-[var(--color-card)]/70 border border-transparent"
                      }`}
                    >
                      <span
                        className={`text-[15px] w-4 text-center ${
                          active ? "text-[var(--color-accent)]" : "text-[var(--color-ink-faint)]"
                        }`}
                      >
                        {item.glyph}
                      </span>
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="m-3 rounded-xl border border-[var(--color-line)] bg-[var(--color-card)] p-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className="grid place-items-center w-8 h-8 rounded-full text-white font-semibold text-xs shrink-0"
            style={{
              background: `linear-gradient(135deg, hsl(${avatarHue} 55% 45%), hsl(${(avatarHue + 30) % 360} 60% 38%))`,
            }}
          >
            {initials}
          </span>
          <div className="leading-tight min-w-0">
            <p className="text-[13px] font-semibold truncate">{name}</p>
            <p className="text-[11px] text-[var(--color-ink-faint)] truncate capitalize">
              {role}
            </p>
          </div>
        </div>
        <button
          onClick={signout}
          className="text-[var(--color-ink-faint)] hover:text-[var(--color-accent)] p-1 rounded transition-colors text-[14px] cursor-pointer"
          title="Sign Out"
        >
          ✕
        </button>
      </div>
    </aside>
  );
}
