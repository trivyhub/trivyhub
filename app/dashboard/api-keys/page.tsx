"use client";
import { useEffect, useState } from "react";
import { apiKeysApi } from "@/lib/api";
import type { APIKey } from "@/lib/types";
import { Plus, Trash2, Copy, Check, Terminal } from "lucide-react";
import { toast } from "@/components/ui/Toast";
import { format } from "date-fns";

function Modal({ onClose, onCreated }: { onClose: () => void; onCreated: (key: APIKey) => void }) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    try { onCreated(await apiKeysApi.create(name)); }
    catch (err) { setError(err instanceof Error ? err.message : "Failed"); }
    finally { setLoading(false); }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, backdropFilter: "blur(6px)", animation: "fade-in 160ms ease" }}>
      <div style={{ width: "min(440px, 92vw)", background: "var(--bg-elev)", border: "1px solid var(--border-strong)", borderRadius: 14, padding: 24, boxShadow: "0 30px 80px -20px rgba(0,0,0,0.7)" }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 20px" }}>Create API key</h2>
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {error && <div style={{ background: "oklch(0.65 0.24 22 / 0.10)", border: "1px solid oklch(0.65 0.24 22 / 0.30)", color: "var(--sev-critical)", padding: "10px 14px", borderRadius: 8, fontSize: 13 }}>{error}</div>}
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "var(--fg-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="github-actions"
              style={{ width: "100%", padding: "8px 12px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, color: "var(--fg)", outline: "none", boxSizing: "border-box" }}
              onFocus={e => (e.target.style.borderColor = "var(--accent-dim)")}
              onBlur={e => (e.target.style.borderColor = "var(--border)")}
            />
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
            <button type="button" onClick={onClose} style={{ padding: "7px 14px", fontSize: 13, color: "var(--fg-muted)", background: "transparent", border: "none", cursor: "pointer" }}>Cancel</button>
            <button type="submit" disabled={loading} style={{
              padding: "7px 16px", fontSize: 13, fontWeight: 500,
              background: "linear-gradient(180deg, oklch(0.92 0.16 130), oklch(0.78 0.18 130))",
              color: "#08080b", border: "none", borderRadius: 8, cursor: "pointer",
              opacity: loading ? 0.6 : 1,
            }}>
              {loading ? "Creating…" : "Create key"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function KeyReveal({ apiKey }: { apiKey: APIKey }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    if (apiKey.key) { navigator.clipboard.writeText(apiKey.key); toast("Key copied to clipboard"); }
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }
  return (
    <div style={{ background: "oklch(0.86 0.18 130 / 0.06)", border: "1px solid oklch(0.86 0.18 130 / 0.25)", borderRadius: 12, padding: 16, marginBottom: 20 }}>
      <p style={{ fontSize: 13, fontWeight: 500, color: "var(--accent)", marginBottom: 10 }}>Key created — copy it now, it won&apos;t be shown again</p>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <code style={{ flex: 1, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 12px", fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--fg)", wordBreak: "break-all" }}>
          {apiKey.key}
        </code>
        <button onClick={copy} style={{ flexShrink: 0, padding: 8, background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--fg-muted)", cursor: "pointer" }}>
          {copied ? <Check size={14} style={{ color: "var(--accent)" }}/> : <Copy size={14}/>}
        </button>
      </div>
    </div>
  );
}

export default function APIKeysPage() {
  const [keys, setKeys] = useState<APIKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newKey, setNewKey] = useState<APIKey | null>(null);

  function reload() {
    setLoading(true);
    apiKeysApi.list().then(k => setKeys(k ?? [])).finally(() => setLoading(false));
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { reload(); }, []);

  async function revoke(id: number) {
    if (!confirm("Revoke this key? This cannot be undone.")) return;
    try { await apiKeysApi.revoke(id); toast("API key revoked"); reload(); }
    catch (err) { toast(err instanceof Error ? err.message : "Failed", "error"); }
  }

  function handleCreated(key: APIKey) { setNewKey(key); setShowModal(false); reload(); }

  return (
    <div style={{ padding: "28px 32px", maxWidth: 900, margin: "0 auto", animation: "page-in 320ms cubic-bezier(0.2,0.7,0.2,1)" }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 28, gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-0.02em", margin: 0 }}>API Keys</h1>
          <p style={{ color: "var(--fg-dim)", fontSize: 13.5, marginTop: 4 }}>Used for CI/CD pipelines and the trivy-push CLI</p>
        </div>
        <button onClick={() => setShowModal(true)} style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "7px 14px", borderRadius: 8, fontSize: 13, fontWeight: 500,
          background: "linear-gradient(180deg, oklch(0.92 0.16 130), oklch(0.78 0.18 130))",
          color: "#08080b", border: "none", cursor: "pointer",
          boxShadow: "0 0 0 1px oklch(0.78 0.18 130), 0 8px 24px -8px var(--accent-glow)",
        }}>
          <Plus size={14}/> New key
        </button>
      </div>

      {newKey && <KeyReveal apiKey={newKey}/>}

      {/* Keys table */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden", marginBottom: 20 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--surface-2)", borderBottom: "1px solid var(--border)" }}>
              {["Name", "Prefix", "Created", "Last used", "Status", ""].map((h, i) => (
                <th key={i} style={{ textAlign: i === 5 ? "right" : "left", padding: "11px 16px", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--fg-dim)", fontWeight: 500 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} style={{ padding: "14px 16px" }}>
                      <div style={{ height: 12, background: "var(--surface-2)", borderRadius: 4 }}/>
                    </td>
                  ))}
                </tr>
              ))
            ) : keys.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: "48px 0", textAlign: "center", color: "var(--fg-dim)", fontSize: 13 }}>No API keys yet</td></tr>
            ) : keys.map(k => (
              <tr key={k.id}
                style={{ borderBottom: "1px solid var(--border)", opacity: k.revoked ? 0.4 : 1, transition: "background 140ms ease" }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--surface-2)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <td style={{ padding: "14px 16px", fontWeight: 500, fontSize: 13 }}>{k.name}</td>
                <td style={{ padding: "14px 16px", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-dim)" }}>{k.key_prefix}…</td>
                <td style={{ padding: "14px 16px", fontSize: 12, color: "var(--fg-dim)" }}>{format(new Date(k.created_at), "MMM d, yyyy")}</td>
                <td style={{ padding: "14px 16px", fontSize: 12, color: "var(--fg-dim)" }}>{k.last_used_at ? format(new Date(k.last_used_at), "MMM d, HH:mm") : <span style={{ color: "var(--fg-faint)" }}>Never</span>}</td>
                <td style={{ padding: "14px 16px" }}>
                  {k.revoked
                    ? <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, background: "oklch(0.65 0.24 22 / 0.10)", color: "var(--sev-critical)", fontFamily: "var(--font-mono)" }}>Revoked</span>
                    : <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, background: "oklch(0.86 0.18 130 / 0.10)", color: "var(--accent)", fontFamily: "var(--font-mono)" }}>Active</span>}
                </td>
                <td style={{ padding: "14px 16px", textAlign: "right" }}>
                  {!k.revoked && (
                    <button onClick={() => revoke(k.id)} style={{ background: "transparent", border: "none", color: "var(--fg-faint)", cursor: "pointer", transition: "color 140ms ease" }}
                      onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = "var(--sev-critical)")}
                      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = "var(--fg-faint)")}
                    >
                      <Trash2 size={14}/>
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Quick start */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <Terminal size={15} style={{ color: "var(--fg-dim)" }}/>
          <span style={{ fontSize: 13, fontWeight: 500, color: "var(--fg-muted)" }}>Quick start</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            "trivy-push config --url https://api.trivyhub.fr --key tvd_xxx",
            "trivy image --format json my-image:latest | trivy-push push --project my-app",
          ].map((cmd, i) => (
            <div key={i} style={{ background: "#050507", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 14px" }}>
              <code style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "oklch(0.78 0.16 280)" }}>{cmd}</code>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 12, color: "var(--fg-faint)", marginTop: 12 }}>
          Or use the{" "}
          <a href="https://github.com/trivyhub/trivy-dashboard-web/blob/main/.github/actions/trivy-push/action.yml"
            target="_blank" rel="noopener noreferrer"
            style={{ color: "var(--violet)", textDecoration: "none" }}>
            GitHub Action
          </a>
          {" "}for CI/CD integration.
        </p>
      </div>

      {showModal && <Modal onClose={() => setShowModal(false)} onCreated={handleCreated}/>}
    </div>
  );
}
