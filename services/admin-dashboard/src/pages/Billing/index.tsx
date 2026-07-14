import React, { useState, useEffect } from "react";
import PageHeader from "../../components/PageHeader";
import { api } from "../../api/client";

interface Plan {
  key: string;
  name: string;
  price: string;
  rpm: number | string;
  tpm: string;
  tpd: string;
}

export default function Billing() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPlans() {
      try {
        const data = await api.get<{ plans: Plan[] }>("/api/v1/billing/plans");
        setPlans(data.plans || []);
      } catch (err) {
        console.error("Failed to load plans", err);
      } finally {
        setLoading(false);
      }
    }
    loadPlans();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <span className="w-8 h-8 rounded-full border-4 border-[var(--color-line-strong)] border-t-[var(--color-accent)] animate-spin" />
        <span className="text-[13px] text-[var(--color-ink-faint)] font-semibold tracking-wider uppercase">Loading billing plans...</span>
      </div>
    );
  }

  const activePlanCount = plans.filter((p) => p.name !== "Free").length;

  return (
    <div className="reveal">
      <PageHeader
        eyebrow="Platform · Billing"
        title="Billing Plans"
        description="Configure standard usage tier quotas, request-per-minute (RPM) limits, and token-per-minute (TPM) ceilings."
      />

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="card p-5">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-[var(--color-ink-faint)]">Total Plans</p>
          <p className="font-display text-[28px] font-semibold mt-1.5 tracking-tight">{plans.length}</p>
        </div>
        <div className="card p-5">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-[var(--color-ink-faint)]">Paid Plans</p>
          <p className="font-display text-[28px] font-semibold mt-1.5 tracking-tight text-[var(--color-sage)]">{activePlanCount}</p>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="text-[11px] uppercase tracking-wide text-[var(--color-ink-faint)] bg-[var(--color-canvas-2)]/50">
              <th className="font-semibold px-5 py-3">Plan Name</th>
              <th className="font-semibold px-5 py-3">Price</th>
              <th className="font-semibold px-5 py-3">Requests/Min</th>
              <th className="font-semibold px-5 py-3">Tokens/Min</th>
              <th className="font-semibold px-5 py-3">Tokens/Day</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-line)]">
            {plans.map((p) => (
              <tr key={p.key} className="hover:bg-[var(--color-canvas-2)]/40 transition-colors">
                <td className="px-5 py-3.5">
                  <span className="tag bg-[var(--color-indigo-soft)] text-[var(--color-indigo)] border-[#c9c9e8]">
                    {p.name}
                  </span>
                </td>
                <td className="px-5 py-3.5 font-semibold text-[14px]">{p.price}</td>
                <td className="px-5 py-3.5 text-[13px] tabular-nums text-[var(--color-ink-soft)]">{p.rpm}</td>
                <td className="px-5 py-3.5 text-[13px] tabular-nums text-[var(--color-ink-soft)]">{p.tpm}</td>
                <td className="px-5 py-3.5 text-[13px] tabular-nums text-[var(--color-ink-soft)]">{p.tpd}</td>
              </tr>
            ))}
            {plans.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center text-[var(--color-ink-faint)]">
                  No billing plans configured.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
