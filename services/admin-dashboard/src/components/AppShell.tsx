import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import Sidebar from "./Sidebar";

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="px-5 md:px-10 pt-6 pb-3 border-b border-[var(--color-line)] bg-[var(--color-canvas)]/80 backdrop-blur sticky top-0 z-20">
          <div className="flex items-center justify-between gap-4">
            <div className="md:hidden font-display text-lg font-semibold">Optamus</div>
            <div className="hidden md:flex items-center gap-2 text-[13px] text-[var(--color-ink-faint)]">
              <span className="w-2 h-2 rounded-full bg-[var(--color-sage)] inline-block animate-pulse" />
              All systems operational
              <span className="text-[var(--color-line-strong)]">·</span>
              us-east-1
            </div>
            <div className="flex items-center gap-2">
              <a href="https://docs.optamus.cloud" target="_blank" rel="noreferrer" className="btn btn-ghost hidden sm:inline-flex">
                Docs
              </a>
              <Link to="/users" className="btn btn-accent">
                <span className="text-base leading-none">＋</span> Invite
              </Link>
            </div>
          </div>
        </div>
        <main className="flex-1 px-5 md:px-10 py-8 max-w-[1200px] w-full mx-auto">{children}</main>
        <footer className="px-5 md:px-10 py-6 border-t border-[var(--color-line)] text-[12px] text-[var(--color-ink-faint)] flex flex-wrap gap-x-6 gap-y-1 justify-between">
          <span>© 2026 Optamus, Inc.</span>
          <span className="flex gap-4">
            <span className="hover:text-[var(--color-ink-soft)] cursor-pointer">Privacy</span>
            <span className="hover:text-[var(--color-ink-soft)] cursor-pointer">Security</span>
            <span className="hover:text-[var(--color-ink-soft)] cursor-pointer">Status</span>
            <span>v4.6.2</span>
          </span>
        </footer>
      </div>
    </div>
  );
}
