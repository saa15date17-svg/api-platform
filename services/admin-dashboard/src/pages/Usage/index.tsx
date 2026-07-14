import React, { useState, useEffect } from "react";
import PageHeader from "../../components/PageHeader";
import { AreaChart, BarRow, Donut } from "../../components/charts";
import { fmt, money, Avatar } from "../../components/ui";
import { api } from "../../api/client";

interface DailySeriesItem {
  day: string;
  activeUsers: number;
  messages: number;
  tokens: number;
  spend: number;
}

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

interface ModelItem {
  model: string;
  requests: number;
  tokens: number;
  spend: number;
}

export default function Usage() {
  const [series, setSeries] = useState<DailySeriesItem[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [models, setModels] = useState<ModelItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUsageData() {
      try {
        const [seriesRes, membersRes, modelsRes] = await Promise.all([
          api.get<DailySeriesItem[]>("/api/v1/analytics/dashboard/daily-series"),
          api.get<Member[]>("/api/v1/analytics/dashboard/members"),
          api.get<ModelItem[]>("/api/v1/analytics/dashboard/models"),
        ]);
        setSeries(seriesRes);
        setMembers(membersRes);
        setModels(modelsRes);
      } catch (err) {
        console.error("Failed to load usage data", err);
      } finally {
        setLoading(false);
      }
    }
    loadUsageData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <span className="w-8 h-8 rounded-full border-4 border-[var(--color-line-strong)] border-t-[var(--color-accent)] animate-spin" />
        <span className="text-[13px] text-[var(--color-ink-faint)] font-semibold tracking-wider uppercase">Loading usage analytics...</span>
      </div>
    );
  }

  const ranges = [30, 60, 90];
  const active = 90;
  const sliced = series.slice(-active);

  const totals = sliced.reduce(
    (a, d) => ({
      messages: a.messages + d.messages,
      tokens: a.tokens + Number(d.tokens),
      spend: a.spend + Number(d.spend),
      users: a.users + d.activeUsers,
    }),
    { messages: 0, tokens: 0, spend: 0, users: 0 }
  );
  const avgUsers = Math.round(totals.users / sliced.length);

  const messageSeries = sliced.map((d) => d.messages);
  const spendSeries = sliced.map((d) => Number(d.spend));

  const topUsers = [...members]
    .filter((m) => m.status === "active")
    .sort((a, b) => b.tokens - a.tokens)
    .slice(0, 6);
  const maxTok = topUsers[0]?.tokens || 1;

  const modelSegments = models.map((m, i) => ({
    value: Number(m.tokens),
    label: m.model,
    color: ["var(--color-accent)", "var(--color-accent-2)", "var(--color-sage)", "var(--color-indigo)"][i % 4],
  }));

  return (
    <div className="reveal">
      <PageHeader
        eyebrow="Analytics"
        title="Usage Analytics"
        description="Aggregate and per-user usage across the workspace. Token consumption, spend, and model distribution — surfaced without exposing any conversation content."
        actions={
          <div className="flex items-center gap-1 rounded-lg bg-[var(--color-canvas-2)] p-1 text-[13px] font-semibold">
            {ranges.map((r) => (
              <span
                key={r}
                className={`px-3 py-1.5 rounded-md ${r === active ? "bg-[var(--color-card)] shadow-sm" : "text-[var(--color-ink-faint)]"}`}
              >
                {r}d
              </span>
            ))}
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Stat label="Messages" value={fmt(totals.messages)} sub={`${active} days`} />
        <Stat label="Tokens" value={fmt(totals.tokens)} sub="processed" />
        <Stat label="Spend" value={money(totals.spend)} sub="total" />
        <Stat label="Avg daily users" value={fmt(avgUsers)} sub="mean" />
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <section className="card p-6 lg:col-span-2 reveal-2">
          <h2 className="font-display text-[20px] font-semibold">Messages per day</h2>
          <p className="text-[13px] text-[var(--color-ink-faint)] mb-4">Volume trend over the selected window</p>
          <AreaChart data={messageSeries} height={230} stroke="var(--color-accent)" fill="var(--color-accent)" />
        </section>
        <section className="card p-6 reveal-3">
          <h2 className="font-display text-[20px] font-semibold mb-1">Spend shape</h2>
          <p className="text-[13px] text-[var(--color-ink-faint)] mb-4">Daily cost distribution</p>
          <AreaChart data={spendSeries} height={230} stroke="var(--color-sage)" fill="var(--color-sage)" />
        </section>
      </div>

      <div className="grid lg:grid-cols-3 gap-5 mt-5">
        <section className="card p-6 lg:col-span-2 reveal-3">
          <h2 className="font-display text-[20px] font-semibold mb-1">Heaviest users</h2>
          <p className="text-[13px] text-[var(--color-ink-faint)] mb-5">Top contributors by token usage</p>
          <div className="space-y-4">
            {topUsers.map((m) => (
              <div key={m.id} className="flex items-center gap-3">
                <Avatar name={m.name} hue={m.avatarHue} size={32} />
                <BarRow
                  label={m.name}
                  value={m.tokens}
                  max={maxTok}
                  display={fmt(m.tokens)}
                  color="var(--color-accent)"
                />
              </div>
            ))}
          </div>
        </section>

        <section className="card p-6 reveal-4">
          <h2 className="font-display text-[20px] font-semibold mb-1">Tokens by model</h2>
          <p className="text-[13px] text-[var(--color-ink-faint)] mb-4">Share of processing cost</p>
          <Donut segments={modelSegments} centerLabel={fmt(totals.tokens)} centerSub="tokens" />
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="card p-5">
      <p className="text-[12px] font-semibold uppercase tracking-wide text-[var(--color-ink-faint)]">{label}</p>
      <p className="font-display text-[28px] font-semibold mt-1.5 tracking-tight">{value}</p>
      <p className="text-[12px] text-[var(--color-ink-soft)] mt-1">{sub}</p>
    </div>
  );
}
