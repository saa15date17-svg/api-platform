import React, { useState, useEffect } from "react";
import PageHeader from "../../components/PageHeader";
import MembersTable from "../../components/MembersTable";
import { api } from "../../api/client";
import { fmt, money } from "../../components/ui";

interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
  seat: string;
  status: string;
  department: string;
  joinedAt: string;
  lastActiveAt: string;
  messages: number;
  tokens: number;
  spend: number;
  avatarHue: number;
}

export default function Users() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMembers() {
      try {
        const data = await api.get<Member[]>("/api/v1/analytics/dashboard/members");
        setMembers(data);
      } catch (err) {
        console.error("Failed to load members", err);
      } finally {
        setLoading(false);
      }
    }
    loadMembers();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <span className="w-8 h-8 rounded-full border-4 border-[var(--color-line-strong)] border-t-[var(--color-accent)] animate-spin" />
        <span className="text-[13px] text-[var(--color-ink-faint)] font-semibold tracking-wider uppercase">Loading members...</span>
      </div>
    );
  }

  const active = members.filter((m) => m.status === "active");
  const admins = members.filter((m) => m.role !== "member");
  const totalSpend = members.reduce((s, m) => s + Number(m.spend), 0);

  const stats = [
    { label: "Total members", value: fmt(members.length) },
    { label: "Active now / 7d", value: `${active.length}` },
    { label: "Admins & owners", value: fmt(admins.length) },
    { label: "Blended spend", value: money(totalSpend) },
  ];

  return (
    <div className="reveal">
      <PageHeader
        eyebrow="Workspace · People"
        title="Members"
        description="Manage who has access to Optamus, their roles, seat types, and per-member usage. Owners and admins can provision, upgrade, and offboard people."
        actions={
          <button className="btn btn-accent cursor-pointer">
            <span className="text-base leading-none">＋</span> Invite people
          </button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((s) => (
          <div key={s.label} className="card p-5">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-[var(--color-ink-faint)]">
              {s.label}
            </p>
            <p className="font-display text-[28px] font-semibold mt-1.5 tracking-tight">
              {s.value}
            </p>
          </div>
        ))}
      </div>

      <MembersTable members={members} />
    </div>
  );
}
