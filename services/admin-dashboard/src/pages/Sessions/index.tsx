import React, { useState, useEffect } from "react";
import PageHeader from "../../components/PageHeader";
import { Avatar, timeAgo } from "../../components/ui";
import { api } from "../../api/client";

interface Session {
  id: string;
  title: string;
  model: string;
  messages: number;
  createdAt: string;
  memberName: string;
  avatarHue: number;
}

export default function Sessions() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSessions() {
      try {
        const data = await api.get<Session[]>("/api/v1/analytics/dashboard/sessions");
        setSessions(data);
      } catch (err) {
        console.error("Failed to load sessions", err);
      } finally {
        setLoading(false);
      }
    }
    loadSessions();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <span className="w-8 h-8 rounded-full border-4 border-[var(--color-line-strong)] border-t-[var(--color-accent)] animate-spin" />
        <span className="text-[13px] text-[var(--color-ink-faint)] font-semibold tracking-wider uppercase">Loading conversations...</span>
      </div>
    );
  }

  const byDate: Record<string, Session[]> = {};
  for (const s of sessions) {
    if (!s.createdAt) continue;
    const d = new Date(s.createdAt).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    (byDate[d] ??= []).push(s);
  }
  const groups = Object.entries(byDate);

  return (
    <div className="reveal">
      <PageHeader
        eyebrow="Workspace · Activity"
        title="Conversations"
        description="A workspace-wide, content-free view of recent sessions. Admins see titles, models, and message counts — never the contents of a member's chat."
        actions={<button className="btn btn-ghost cursor-pointer">Export log</button>}
      />

      <div className="space-y-8">
        {groups.map(([date, items]) => (
          <section key={date}>
            <div className="flex items-center gap-3 mb-3">
              <h2 className="font-display text-[16px] font-semibold text-[var(--color-ink-soft)]">{date}</h2>
              <span className="text-[12px] text-[var(--color-ink-faint)]">· {items.length} sessions</span>
              <span className="flex-1 h-px bg-[var(--color-line)]" />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {items.map((s) => (
                <div
                  key={s.id}
                  className="card p-4 hover:border-[var(--color-line-strong)] hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold text-[15px] leading-snug">{s.title}</p>
                    <span className="tag shrink-0">{s.model.replace("Optamus ", "")}</span>
                  </div>
                  <div className="mt-3 flex items-center gap-2.5">
                    <Avatar name={s.memberName ?? "Unknown"} hue={s.avatarHue ?? 20} size={28} />
                    <span className="text-[13px] text-[var(--color-ink-soft)]">
                      {s.memberName ?? "Unknown"}
                    </span>
                    <span className="ml-auto text-[12px] text-[var(--color-ink-faint)]">
                      {s.messages} msgs · {timeAgo(s.createdAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
        {sessions.length === 0 && (
          <div className="card p-8 text-center text-[var(--color-ink-faint)]">
            No active conversations found.
          </div>
        )}
      </div>
    </div>
  );
}
