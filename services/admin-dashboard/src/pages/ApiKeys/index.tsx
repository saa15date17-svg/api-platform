import React, { useState, useEffect } from "react";
import PageHeader from "../../components/PageHeader";
import { api } from "../../api/client";
import { money, timeAgo } from "../../components/ui";

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  is_active: boolean;
  spending_limit: number | null;
  created_at: number;
}

export default function ApiKeys() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyUserId, setNewKeyUserId] = useState("");
  const [newKeyLimit, setNewKeyLimit] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  const fetchKeys = async () => {
    try {
      setLoading(true);
      const data = await api.get<{ keys: ApiKey[] }>("/api/v1/keys");
      setKeys(data.keys || []);
    } catch (err) {
      console.error("Failed to load keys", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post<{ token: string }>("/api/v1/keys", {
        name: newKeyName,
        user_id: newKeyUserId,
        spending_limit: newKeyLimit ? parseFloat(newKeyLimit) : null,
      });
      setCreatedKey(res.token);
      setNewKeyName("");
      setNewKeyUserId("");
      setNewKeyLimit("");
      fetchKeys();
    } catch (err) {
      console.error("Failed to create key", err);
      alert("Failed to create API key.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to revoke API key "${name}"? This cannot be undone.`)) {
      return;
    }
    try {
      await api.delete(`/api/v1/keys/${id}`);
      setKeys((prev) => prev.filter((k) => k.id !== id));
    } catch (err) {
      console.error("Failed to revoke key", err);
      alert("Failed to revoke API key.");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <span className="w-8 h-8 rounded-full border-4 border-[var(--color-line-strong)] border-t-[var(--color-accent)] animate-spin" />
        <span className="text-[13px] text-[var(--color-ink-faint)] font-semibold tracking-wider uppercase">Loading API keys...</span>
      </div>
    );
  }

  const activeKeys = keys.filter((k) => k.is_active).length;

  return (
    <div className="reveal">
      <PageHeader
        eyebrow="Platform · Security"
        title="Developer API Keys"
        description="Provision and revoke keys for programmatically accessing the Optamus LLM inference gateway. Spending caps protect against runway bills."
        actions={
          <button onClick={() => { setCreatedKey(null); setIsModalOpen(true); }} className="btn btn-accent cursor-pointer">
            <span className="text-base leading-none">＋</span> Generate API Key
          </button>
        }
      />

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card p-5">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-[var(--color-ink-faint)]">Total Keys</p>
          <p className="font-display text-[28px] font-semibold mt-1.5 tracking-tight">{keys.length}</p>
        </div>
        <div className="card p-5">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-[var(--color-ink-faint)]">Active Keys</p>
          <p className="font-display text-[28px] font-semibold mt-1.5 tracking-tight text-[var(--color-sage)]">{activeKeys}</p>
        </div>
        <div className="card p-5">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-[var(--color-ink-faint)]">Revoked Keys</p>
          <p className="font-display text-[28px] font-semibold mt-1.5 tracking-tight text-[var(--color-accent)]">{keys.length - activeKeys}</p>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="text-[11px] uppercase tracking-wide text-[var(--color-ink-faint)] bg-[var(--color-canvas-2)]/50">
              <th className="font-semibold px-5 py-3">Key Name</th>
              <th className="font-semibold px-5 py-3">Prefix</th>
              <th className="font-semibold px-5 py-3">Status</th>
              <th className="font-semibold px-5 py-3">Spending Limit</th>
              <th className="font-semibold px-5 py-3">Created</th>
              <th className="font-semibold px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-line)]">
            {keys.map((k) => (
              <tr key={k.id} className="hover:bg-[var(--color-canvas-2)]/40 transition-colors">
                <td className="px-5 py-3.5 font-semibold text-[14px]">{k.name}</td>
                <td className="px-5 py-3.5 font-mono text-[13px] text-[var(--color-ink-soft)]">{k.key_prefix}...</td>
                <td className="px-5 py-3.5">
                  <span className={`tag ${k.is_active ? "bg-[var(--color-sage-soft)] text-[var(--color-sage)] border-[#cdddcc]" : "bg-[var(--color-accent-soft)] text-[var(--color-accent)] border-[#f0c9ba]"}`}>
                    {k.is_active ? "Active" : "Disabled"}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-[13px] tabular-nums font-medium">
                  {k.spending_limit !== null && k.spending_limit !== undefined ? money(k.spending_limit) : "Unlimited"}
                </td>
                <td className="px-5 py-3.5 text-[13px] text-[var(--color-ink-faint)]">
                  {k.created_at ? timeAgo(new Date(k.created_at * 1000)) : "-"}
                </td>
                <td className="px-5 py-3.5 text-right">
                  {k.is_active && (
                    <button
                      onClick={() => handleRevoke(k.id, k.name)}
                      className="text-[12px] font-semibold text-[var(--color-accent)] hover:underline cursor-pointer"
                    >
                      Revoke Key
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {keys.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-[var(--color-ink-faint)]">
                  No API keys have been generated yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Generator Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs reveal">
          <div className="card max-w-md w-full p-6 bg-[var(--color-card)] relative">
            <h3 className="font-display text-[22px] font-semibold mb-2">Generate New API Key</h3>
            
            {createdKey ? (
              <div className="space-y-4">
                <div className="p-3 bg-[var(--color-sage-soft)] text-[var(--color-sage)] rounded-lg text-[13px] font-semibold border border-[#cdddcc]">
                  API key generated successfully! Copy it now. You won't be able to see it again.
                </div>
                <div className="p-3.5 font-mono text-[14px] bg-[var(--color-canvas-2)] text-[var(--color-ink)] rounded-lg break-all select-all border border-[var(--color-line)]">
                  {createdKey}
                </div>
                <button
                  onClick={() => { setIsModalOpen(false); setCreatedKey(null); }}
                  className="btn btn-primary w-full cursor-pointer"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreate} className="space-y-4">
                <label className="block">
                  <span className="block text-[13px] font-semibold mb-1.5">Key Name</span>
                  <input
                    className="input"
                    placeholder="e.g. Production Backend"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    required
                  />
                </label>
                <label className="block">
                  <span className="block text-[13px] font-semibold mb-1.5">User ID to Bind</span>
                  <input
                    className="input"
                    placeholder="User ID of the developer"
                    value={newKeyUserId}
                    onChange={(e) => setNewKeyUserId(e.target.value)}
                    required
                  />
                </label>
                <label className="block">
                  <span className="block text-[13px] font-semibold mb-1.5">Spending Limit ($USD, Optional)</span>
                  <input
                    type="number"
                    step="0.01"
                    className="input"
                    placeholder="e.g. 50.00"
                    value={newKeyLimit}
                    onChange={(e) => setNewKeyLimit(e.target.value)}
                  />
                </label>
                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="btn btn-ghost cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-accent cursor-pointer"
                    disabled={submitting}
                  >
                    {submitting ? "Generating..." : "Generate"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
