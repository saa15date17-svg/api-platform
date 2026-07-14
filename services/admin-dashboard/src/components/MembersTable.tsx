import { useState, useMemo } from "react";
import { Avatar, RoleBadge, StatusDot, fmt, money, timeAgo } from "./ui";

type Member = {
  id: string;
  name: string;
  email: string;
  role: string;
  seat: string;
  status: string;
  department: string;
  lastActiveAt: string;
  messages: number;
  tokens: number;
  spend: string | number;
  avatarHue: number;
};

export default function MembersTable({ members }: { members: Member[] }) {
  const [q, setQ] = useState("");
  const [role, setRole] = useState("all");

  const filtered = useMemo(() => {
    return members.filter((m) => {
      const matchesQ =
        !q ||
        m.name.toLowerCase().includes(q.toLowerCase()) ||
        m.email.toLowerCase().includes(q.toLowerCase()) ||
        m.department.toLowerCase().includes(q.toLowerCase());
      const matchesRole = role === "all" || m.role === role;
      return matchesQ && matchesRole;
    });
  }, [members, q, role]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input
          className="input max-w-xs"
          placeholder="Search name, email, department…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="flex items-center gap-1 rounded-lg bg-[var(--color-canvas-2)] p-1">
          {["all", "admin", "member"].map((r) => (
            <button
              key={r}
              onClick={() => setRole(r)}
              className={`px-3 py-1.5 text-[13px] font-semibold rounded-md capitalize transition-colors cursor-pointer ${
                role === r
                  ? "bg-[var(--color-card)] text-[var(--color-ink)] shadow-sm"
                  : "text-[var(--color-ink-faint)] hover:text-[var(--color-ink-soft)]"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
        <span className="ml-auto text-[13px] text-[var(--color-ink-faint)]">
          {filtered.length} of {members.length} members
        </span>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="text-[11px] uppercase tracking-wide text-[var(--color-ink-faint)] bg-[var(--color-canvas-2)]/50">
              <th className="font-semibold px-5 py-3">Member</th>
              <th className="font-semibold px-5 py-3">Role</th>
              <th className="font-semibold px-5 py-3 hidden md:table-cell">Seat</th>
              <th className="font-semibold px-5 py-3 hidden lg:table-cell">Messages</th>
              <th className="font-semibold px-5 py-3 hidden lg:table-cell">Tokens</th>
              <th className="font-semibold px-5 py-3 hidden md:table-cell">Spend</th>
              <th className="font-semibold px-5 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-line)]">
            {filtered.map((m) => (
              <tr key={m.id} className="hover:bg-[var(--color-canvas-2)]/40 transition-colors">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <Avatar name={m.name} hue={m.avatarHue} />
                    <div className="min-w-0">
                      <p className="text-[14px] font-semibold truncate">{m.name}</p>
                      <p className="text-[12px] text-[var(--color-ink-faint)] truncate">
                        {m.email}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3.5"><RoleBadge role={m.role} /></td>
                <td className="px-5 py-3.5 hidden md:table-cell">
                  <span className={`text-[12px] font-semibold capitalize ${m.seat === "premium" ? "text-[var(--color-accent-2)]" : "text-[var(--color-ink-soft)]"}`}>
                    {m.seat}
                  </span>
                </td>
                <td className="px-5 py-3.5 hidden lg:table-cell tabular-nums text-[13px]">{fmt(m.messages)}</td>
                <td className="px-5 py-3.5 hidden lg:table-cell tabular-nums text-[13px]">{fmt(m.tokens)}</td>
                <td className="px-5 py-3.5 hidden md:table-cell tabular-nums text-[13px] font-semibold">{money(Number(m.spend))}</td>
                <td className="px-5 py-3.5 text-[12px] capitalize">
                  <StatusDot status={m.status} />
                  <span className="ml-1.5 text-[var(--color-ink-soft)]">
                    {m.status === "active" ? timeAgo(m.lastActiveAt) : ""}
                  </span>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-[var(--color-ink-faint)]">
                  No members match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
