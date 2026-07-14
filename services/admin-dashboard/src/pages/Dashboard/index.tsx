import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/client";
import { useAuth } from "../../hooks/useAuth";
import PageHeader from "../../components/PageHeader";
import { AreaChart, Donut, BarRow, Sparkline } from "../../components/charts";
import { Avatar, RoleBadge, fmt, money, timeAgo } from "../../components/ui";

interface SeatsInfo {
  total: number;
  active: number;
  invited: number;
  premium: number;
  capacity: number;
}

interface OverviewData {
  seats: SeatsInfo;
  tokens: number;
  spendMtd: number;
  totalMessages: number;
  avgActive7d: number;
  ownerId: string;
}

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

export default function Dashboard() {
  const { user } = useAuth();
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [series, setSeries] = useState<DailySeriesItem[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [models, setModels] = useState<ModelItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [overviewRes, seriesRes, membersRes, modelsRes] = await Promise.all([
          api.get<OverviewData>("/api/v1/analytics/dashboard/overview"),
          api.get<DailySeriesItem[]>("/api/v1/analytics/dashboard/daily-series"),
          api.get<Member[]>("/api/v1/analytics/dashboard/members"),
          api.get<ModelItem[]>("/api/v1/analytics/dashboard/models"),
        ]);
        setOverview(overviewRes);
        setSeries(seriesRes);
        setMembers(membersRes);
        setModels(modelsRes);
      } catch (err) {
        console.error("Failed to load dashboard data", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading || !overview) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <span className="w-8 h-8 rounded-full border-4 border-[var(--color-line-strong)] border-t-[var(--color-accent)] animate-spin" />
        <span className="text-[13px] text-[var(--color-ink-faint)] font-semibold tracking-wider uppercase">Loading console...</span>
      </div>
    );
  }

  const activeSeries = series.map((d) => d.activeUsers);
  const messageSeries = series.map((d) => d.messages);
  const last14 = messageSeries.slice(-14);

  const seatPct = Math.round((overview.seats.active / overview.seats.capacity) * 100);
  const recent = members.slice(0, 6);
  const topModel = models[0];

  const modelSegments = models.map((m, i) => ({
    value: Number(m.requests),
    label: m.model,
    color: ["var(--color-accent)", "var(--color-accent-2)", "var(--color-sage)", "var(--color-indigo)"][i % 4],
  }));

  const firstName = user?.name ? user.name.split(" ")[0] : "Admin";

  return (
    <div className="reveal">
      <PageHeader
        eyebrow="Workspace"
        title={`Good afternoon, ${firstName}.`}
        description={`Here's how Optamus is being used across your organization this quarter. ${overview.seats.active} of ${overview.seats.capacity} seats are active.`}
        actions={
          <>
            <button className="btn btn-ghost cursor-pointer">Export report</button>
            <Link to="/users" className="btn btn-accent">
              Manage members
            </Link>
          </>
        }
      />

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Kpi
          label="Active seats"
          value={`${overview.seats.active}/${overview.seats.capacity}`}
          sub={`${seatPct}% utilized`}
          accent="var(--color-accent)"
          bar={seatPct}
        />
        <Kpi
          label="Avg. daily users (7d)"
          value={fmt(overview.avgActive7d)}
          sub={`${overview.seats.invited} pending invites`}
          accent="var(--color-sage)"
        />
        <Kpi
          label="Tokens used"
          value={fmt(overview.tokens)}
          sub="this quarter"
          accent="var(--color-indigo)"
        />
        <Kpi
          label="Spend (MTD)"
          value={money(overview.spendMtd)}
          sub="within $12k cap"
          accent="var(--color-accent-2)"
        />
      </div>

      {/* Main grid */}
      <div className="grid lg:grid-cols-3 gap-5">
        <section className="card p-6 lg:col-span-2 reveal-2">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="font-display text-[20px] font-semibold">Usage trend</h2>
              <p className="text-[13px] text-[var(--color-ink-faint)]">
                Daily active users · last 90 days
              </p>
            </div>
            <div className="flex items-center gap-2 text-[12px] text-[var(--color-ink-soft)] font-semibold">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[var(--color-accent)]" /> Users
              </span>
            </div>
          </div>
          <AreaChart data={activeSeries} height={220} />
          <div className="mt-5 pt-5 hairline grid grid-cols-3 gap-4">
            <MiniStat label="Peak day" value={`${fmt(Math.max(...activeSeries, 0))}`} hint="users" />
            <MiniStat label="Total messages" value={fmt(overview.totalMessages)} hint="90 days" />
            <MiniStat label="Last 14 days" value={`${fmt(last14.reduce((a, b) => a + b, 0))}`} hint="messages" />
          </div>
        </section>

        <section className="card p-6 reveal-3">
          <h2 className="font-display text-[20px] font-semibold mb-1">Model mix</h2>
          <p className="text-[13px] text-[var(--color-ink-faint)] mb-4">
            Requests by model · this quarter
          </p>
          <Donut
            segments={modelSegments}
            centerLabel={fmt(models.reduce((s, m) => s + Number(m.requests), 0))}
            centerSub="requests"
          />
        </section>
      </div>

      {/* Recent members + top model */}
      <div className="grid lg:grid-cols-3 gap-5 mt-5">
        <section className="card p-6 lg:col-span-2 reveal-3">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-[20px] font-semibold">Recent activity</h2>
            <Link to="/users" className="text-[13px] font-semibold text-[var(--color-accent)] hover:underline">
              All members
            </Link>
          </div>
          <ul className="divide-y divide-[var(--color-line)]">
            {recent.map((m) => (
              <li key={m.id} className="flex items-center gap-3 py-3">
                <Avatar name={m.name} hue={m.avatarHue} />
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold truncate">{m.name}</p>
                  <p className="text-[12px] text-[var(--color-ink-faint)] truncate">
                    {m.department} · {m.email}
                  </p>
                </div>
                <RoleBadge role={m.role} />
                <div className="hidden sm:block text-right w-24 shrink-0">
                  <p className="text-[13px] font-semibold tabular-nums">{fmt(m.tokens)} tok</p>
                  <p className="text-[11px] text-[var(--color-ink-faint)]">{timeAgo(m.lastActiveAt)}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="card p-6 reveal-4">
          <h2 className="font-display text-[20px] font-semibold mb-1">Top model</h2>
          <p className="text-[13px] text-[var(--color-ink-faint)] mb-4">By request volume</p>
          {topModel && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="grid place-items-center w-9 h-9 rounded-lg bg-[var(--color-accent-soft)] text-[var(--color-accent)] font-display text-lg font-semibold">
                  Ø
                </span>
                <p className="font-semibold leading-tight">{topModel.model}</p>
              </div>
              <div className="space-y-3">
                <BarRow label="Requests" value={Number(topModel.requests)} max={Math.max(...models.map(m=>m.requests), 1)} display={fmt(Number(topModel.requests))} />
                <BarRow label="Tokens" value={Number(topModel.tokens)} max={Math.max(...models.map(m=>m.tokens), 1)} display={fmt(Number(topModel.tokens))} color="var(--color-accent-2)" />
                <BarRow label="Spend" value={Number(topModel.spend)} max={Math.max(...models.map(m=>m.spend), 1)} display={money(Number(topModel.spend))} color="var(--color-sage)" />
              </div>
              <div className="mt-4 hairline pt-4 flex items-center justify-between">
                <span className="text-[13px] text-[var(--color-ink-faint)]">14-day trend</span>
                <Sparkline data={last14} />
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  sub,
  accent,
  bar,
}: {
  label: string;
  value: string;
  sub: string;
  accent: string;
  bar?: number;
}) {
  return (
    <div className="card p-5 relative overflow-hidden">
      <span className="absolute left-0 top-0 h-full w-1" style={{ background: accent }} />
      <p className="text-[12px] font-semibold uppercase tracking-wide text-[var(--color-ink-faint)]">
        {label}
      </p>
      <p className="font-display text-[30px] font-semibold mt-1.5 tracking-tight">{value}</p>
      <p className="text-[12px] text-[var(--color-ink-soft)] mt-1">{sub}</p>
      {bar !== undefined && (
        <div className="mt-3 h-1.5 rounded-full bg-[var(--color-line)] overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${bar}%`, background: accent }} />
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div>
      <p className="text-[12px] text-[var(--color-ink-faint)]">{label}</p>
      <p className="font-display text-[22px] font-semibold">{value}</p>
      <p className="text-[11px] text-[var(--color-ink-faint)]">{hint}</p>
    </div>
  );
}
