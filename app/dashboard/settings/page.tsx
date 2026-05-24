"use client";
import { useEffect, useState } from "react";
import { authApi } from "@/lib/api";
import { getUser } from "@/lib/auth";
import type { User } from "@/lib/types";
import { Lock, User as UserIcon, Shield, Check } from "lucide-react";

function Section({ title, description, icon: Icon, children }: {
  title: string; description: string; icon: React.ElementType; children: React.ReactNode;
}) {
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--surface-2)", display: "grid", placeItems: "center", flexShrink: 0, border: "1px solid var(--border)" }}>
          <Icon size={15} style={{ color: "var(--fg-muted)" }}/>
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: "var(--fg)" }}>{title}</div>
          <div style={{ fontSize: 11, color: "var(--fg-dim)", marginTop: 2 }}>{description}</div>
        </div>
      </div>
      <div style={{ padding: 20 }}>{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 11, fontWeight: 500, color: "var(--fg-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 12px", background: "var(--surface-2)",
  border: "1px solid var(--border)", borderRadius: 8,
  fontSize: 13, color: "var(--fg)", outline: "none",
  boxSizing: "border-box" as const,
};

const readonlyStyle: React.CSSProperties = {
  ...inputStyle,
  color: "var(--fg-dim)",
  fontFamily: "var(--font-mono)",
};

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdError, setPwdError] = useState("");
  const [pwdSuccess, setPwdSuccess] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);

  useEffect(() => { setUser(getUser()); }, []);

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwdError(""); setPwdSuccess(false);
    if (newPwd !== confirmPwd) { setPwdError("Passwords don't match"); return; }
    if (newPwd.length < 8) { setPwdError("Min. 8 characters"); return; }
    setPwdLoading(true);
    try {
      await authApi.changePassword(currentPwd, newPwd);
      setPwdSuccess(true);
      setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
      setTimeout(() => setPwdSuccess(false), 3000);
    } catch (err) {
      setPwdError(err instanceof Error ? err.message : "Failed");
    } finally {
      setPwdLoading(false);
    }
  }

  return (
    <div style={{ padding: "28px 32px", maxWidth: 680, margin: "0 auto", animation: "page-in 320ms cubic-bezier(0.2,0.7,0.2,1)" }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-0.02em", margin: 0 }}>Settings</h1>
        <p style={{ color: "var(--fg-dim)", fontSize: 13.5, marginTop: 4 }}>Manage your account and organization</p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Profile */}
        <Section title="Profile" description="Your account information" icon={UserIcon}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Field label="Email">
              <div style={readonlyStyle}>{user?.email}</div>
            </Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <Field label="Role">
                <div style={readonlyStyle}>{user?.role}</div>
              </Field>
              <Field label="Organization ID">
                <div style={readonlyStyle}>#{user?.organization_id}</div>
              </Field>
            </div>
          </div>
        </Section>

        {/* Password */}
        <Section title="Password" description="Change your account password" icon={Lock}>
          <form onSubmit={changePassword} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {pwdError && (
              <div style={{ background: "oklch(0.65 0.24 22 / 0.10)", border: "1px solid oklch(0.65 0.24 22 / 0.30)", color: "var(--sev-critical)", padding: "10px 14px", borderRadius: 8, fontSize: 13 }}>
                {pwdError}
              </div>
            )}
            {pwdSuccess && (
              <div style={{ background: "oklch(0.86 0.18 130 / 0.10)", border: "1px solid oklch(0.86 0.18 130 / 0.30)", color: "var(--accent)", padding: "10px 14px", borderRadius: 8, fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
                <Check size={14}/> Password updated successfully
              </div>
            )}
            <Field label="Current password">
              <input type="password" value={currentPwd} onChange={e => setCurrentPwd(e.target.value)} required
                style={{ ...inputStyle, background: "var(--bg)" }}
                onFocus={e => (e.target.style.borderColor = "var(--accent-dim)")}
                onBlur={e => (e.target.style.borderColor = "var(--border)")}
              />
            </Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <Field label="New password">
                <input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} required minLength={8}
                  style={{ ...inputStyle, background: "var(--bg)" }}
                  onFocus={e => (e.target.style.borderColor = "var(--accent-dim)")}
                  onBlur={e => (e.target.style.borderColor = "var(--border)")}
                />
              </Field>
              <Field label="Confirm password">
                <input type="password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} required
                  style={{ ...inputStyle, background: "var(--bg)" }}
                  onFocus={e => (e.target.style.borderColor = "var(--accent-dim)")}
                  onBlur={e => (e.target.style.borderColor = "var(--border)")}
                />
              </Field>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
              <button type="submit" disabled={pwdLoading} style={{
                padding: "7px 16px", fontSize: 13, fontWeight: 500,
                background: "linear-gradient(180deg, oklch(0.92 0.16 130), oklch(0.78 0.18 130))",
                color: "#08080b", border: "none", borderRadius: 8, cursor: "pointer",
                opacity: pwdLoading ? 0.6 : 1,
              }}>
                {pwdLoading ? "Updating…" : "Update password"}
              </button>
            </div>
          </form>
        </Section>

        {/* API Endpoint */}
        <Section title="API Endpoint" description="Connect your CI/CD pipelines" icon={Shield}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Field label="Base URL">
              <div style={{ background: "#050507", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 12px", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--fg-dim)" }}>
                {process.env.NEXT_PUBLIC_API_URL ?? "https://api.trivyhub.fr"}
              </div>
            </Field>
            <Field label="CLI install">
              <div style={{ background: "#050507", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 12px", fontFamily: "var(--font-mono)", fontSize: 12, color: "oklch(0.78 0.16 280)", overflowX: "auto" }}>
                curl -L https://github.com/trivyhub/trivy-dashboard-web/releases/latest/download/trivy-push-linux-amd64 -o trivy-push
              </div>
            </Field>
          </div>
        </Section>
      </div>
    </div>
  );
}
