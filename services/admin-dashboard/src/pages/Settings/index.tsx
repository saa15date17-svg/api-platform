import React, { useState, useEffect } from "react";
import PageHeader from "../../components/PageHeader";
import { api } from "../../api/client";

interface SettingsData {
  platform_name: string;
  support_email: string;
}

function Toggle({ label, desc, on, onChange }: { label: string; desc: string; on?: boolean; onChange?: () => void }) {
  return (
    <div className="flex items-center justify-between gap-6 py-4 hairline">
      <div className="max-w-md">
        <p className="text-[14px] font-semibold">{label}</p>
        <p className="text-[13px] text-[var(--color-ink-faint)] mt-0.5">{desc}</p>
      </div>
      <button
        type="button"
        onClick={onChange}
        className={`relative w-12 h-7 rounded-full transition-colors shrink-0 cursor-pointer ${on ? "bg-[var(--color-accent)]" : "bg-[var(--color-line-strong)]"}`}
        aria-pressed={on}
      >
        <span
          className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${on ? "translate-x-5" : ""}`}
        />
      </button>
    </div>
  );
}

export default function Settings() {
  const [platformName, setPlatformName] = useState("Optamus HQ");
  const [supportEmail, setSupportEmail] = useState("support@optamus.cloud");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Cosmetic toggles state
  const [toggles, setToggles] = useState<Record<string, boolean>>({
    opus: true,
    sonnet: true,
    haiku: true,
    code: true,
    retention: true,
    uploads: true,
    sharing: true,
    export: false,
    blockOver: true,
    sso: true,
    scim: true,
    tfa: true,
    mcp: false,
  });

  useEffect(() => {
    async function loadSettings() {
      try {
        const data = await api.get<SettingsData>("/api/v1/configs/ui");
        if (data) {
          if (data.platform_name) setPlatformName(data.platform_name);
          if (data.support_email) setSupportEmail(data.support_email);
        }
      } catch (err) {
        console.error("Failed to load settings", err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post("/api/v1/configs/ui", {
        platform_name: platformName,
        support_email: supportEmail,
      });
      alert("Settings saved successfully!");
    } catch (err) {
      console.error("Failed to save settings", err);
      alert("Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = (key: string) => {
    setToggles((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <span className="w-8 h-8 rounded-full border-4 border-[var(--color-line-strong)] border-t-[var(--color-accent)] animate-spin" />
        <span className="text-[13px] text-[var(--color-ink-faint)] font-semibold tracking-wider uppercase">Loading settings...</span>
      </div>
    );
  }

  return (
    <div className="reveal">
      <PageHeader
        eyebrow="Platform · Workspace"
        title="Settings"
        description="Workspace-wide policy, access control, and security. Changes apply to every member and take effect immediately."
        actions={
          <button onClick={handleSave} className="btn btn-accent cursor-pointer" disabled={saving}>
            {saving ? "Saving..." : "Save changes"}
          </button>
        }
      />

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <section className="card p-6">
            <h2 className="font-display text-[20px] font-semibold">General</h2>
            <p className="text-[13px] text-[var(--color-ink-faint)] mb-4">Basic workspace identity.</p>
            <div className="grid sm:grid-cols-2 gap-4">
              <label className="block">
                <span className="block text-[13px] font-semibold mb-1.5">Workspace name</span>
                <input
                  className="input"
                  value={platformName}
                  onChange={(e) => setPlatformName(e.target.value)}
                />
              </label>
              <label className="block">
                <span className="block text-[13px] font-semibold mb-1.5">Support email</span>
                <input
                  className="input"
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                />
              </label>
              <label className="block">
                <span className="block text-[13px] font-semibold mb-1.5">Workspace ID</span>
                <input className="input" defaultValue="ws_8f2a91c4" disabled />
              </label>
              <label className="block">
                <span className="block text-[13px] font-semibold mb-1.5">Region</span>
                <input className="input" defaultValue="us-east-1" disabled />
              </label>
            </div>
          </section>

          <section className="card p-6">
            <h2 className="font-display text-[20px] font-semibold">Access & model policy</h2>
            <p className="text-[13px] text-[var(--color-ink-faint)] mb-2">Control which models members can use.</p>
            <div>
              <Toggle label="Optamus Opus 4.6" desc="Available to Premium seats only." on={toggles.opus} onChange={() => handleToggle("opus")} />
              <Toggle label="Optamus Sonnet 4.6" desc="Available to all active members." on={toggles.sonnet} onChange={() => handleToggle("sonnet")} />
              <Toggle label="Optamus Haiku 4.5" desc="Available to all active members." on={toggles.haiku} onChange={() => handleToggle("haiku")} />
              <Toggle label="Optamus Code 4.6" desc="Available to Engineering department." on={toggles.code} onChange={() => handleToggle("code")} />
            </div>
          </section>

          <section className="card p-6">
            <h2 className="font-display text-[20px] font-semibold">Data & retention</h2>
            <p className="text-[13px] text-[var(--color-ink-faint)] mb-2">Your organization's data is never used to train models.</p>
            <div>
              <Toggle label="Chat history retention" desc="Keep conversations for 365 days, then auto-delete." on={toggles.retention} onChange={() => handleToggle("retention")} />
              <Toggle label="Allow personal file uploads" desc="Members can attach documents in chats." on={toggles.uploads} onChange={() => handleToggle("uploads")} />
              <Toggle label="Cross-member project sharing" desc="Workspace-wide shared projects enabled." on={toggles.sharing} onChange={() => handleToggle("sharing")} />
              <Toggle label="Data export by owner" desc="Primary owner may export all workspace data." on={toggles.export} onChange={() => handleToggle("export")} />
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="card p-6">
            <h2 className="font-display text-[18px] font-semibold">Spend controls</h2>
            <p className="text-[13px] text-[var(--color-ink-faint)] mb-4">Caps protect against runaway usage.</p>
            <label className="block text-[13px] font-semibold mb-1.5">Monthly workspace cap</label>
            <div className="flex items-center gap-2">
              <span className="text-[var(--color-ink-faint)] text-[15px]">$</span>
              <input className="input" defaultValue="12000" inputMode="numeric" />
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-[12px] text-[var(--color-ink-faint)] mb-1">
                <span>$4,180 used</span>
                <span>35%</span>
              </div>
              <div className="h-2 rounded-full bg-[var(--color-line)] overflow-hidden">
                <div className="h-full rounded-full bg-[var(--color-accent-2)] animate-pulse" style={{ width: "35%" }} />
              </div>
            </div>
            <Toggle label="Block over cap" desc="Halt new requests past the limit." on={toggles.blockOver} onChange={() => handleToggle("blockOver")} />
          </section>

          <section className="card p-6">
            <h2 className="font-display text-[18px] font-semibold">Security</h2>
            <div>
              <Toggle label="SSO (Okta)" desc="SAML 2.0 enforced for all members." on={toggles.sso} onChange={() => handleToggle("sso")} />
              <Toggle label="SCIM provisioning" desc="Automatically sync from your IdP." on={toggles.scim} onChange={() => handleToggle("scim")} />
              <Toggle label="Require 2FA" desc="Mandatory for every seat." on={toggles.tfa} onChange={() => handleToggle("tfa")} />
              <Toggle label="MCP allowlist" desc="Restrict to admin-approved servers." on={toggles.mcp} onChange={() => handleToggle("mcp")} />
            </div>
            <button className="btn btn-ghost w-full mt-4 cursor-pointer">Rotate admin API key</button>
          </section>
        </div>
      </div>
    </div>
  );
}
