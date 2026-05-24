"use client";
import { useEffect, useState } from "react";
import { membersApi } from "@/lib/api";
import { getUser } from "@/lib/auth";
import type { User } from "@/lib/types";
import { RoleBadge } from "@/components/ui/Badge";
import { UserPlus, Trash2 } from "lucide-react";
import { toast } from "@/components/ui/Toast";
import { format } from "date-fns";

function InviteModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    try { await membersApi.invite(email, role); toast("Member invited successfully"); onSuccess(); onClose(); }
    catch (err) { setError(err instanceof Error ? err.message : "Failed"); toast(err instanceof Error ? err.message : "Failed", "error"); }
    finally { setLoading(false); }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, backdropFilter: "blur(6px)", animation: "fade-in 160ms ease" }}>
      <div style={{ width: "min(440px, 92vw)", background: "var(--bg-elev)", border: "1px solid var(--border-strong)", borderRadius: 14, padding: 24, boxShadow: "0 30px 80px -20px rgba(0,0,0,0.7)" }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 20px" }}>Invite member</h2>
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {error && <div style={{ background: "oklch(0.65 0.24 22 / 0.10)", border: "1px solid oklch(0.65 0.24 22 / 0.30)", color: "var(--sev-critical)", padding: "10px 14px", borderRadius: 8, fontSize: 13 }}>{error}</div>}
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "var(--fg-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              style={{ width: "100%", padding: "8px 12px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, color: "var(--fg)", outline: "none", boxSizing: "border-box" }}
              onFocus={e => (e.target.style.borderColor = "var(--accent-dim)")}
              onBlur={e => (e.target.style.borderColor = "var(--border)")}
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "var(--fg-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Role</label>
            <select value={role} onChange={e => setRole(e.target.value)}
              style={{ width: "100%", padding: "8px 12px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, color: "var(--fg)", outline: "none" }}
            >
              <option value="viewer">Viewer — read only</option>
              <option value="member">Member — can push reports</option>
              <option value="admin">Admin — manage keys & members</option>
            </select>
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
            <button type="button" onClick={onClose} style={{ padding: "7px 14px", fontSize: 13, color: "var(--fg-muted)", background: "transparent", border: "none", cursor: "pointer" }}>Cancel</button>
            <button type="submit" disabled={loading} style={{
              padding: "7px 16px", fontSize: 13, fontWeight: 500,
              background: "linear-gradient(180deg, oklch(0.92 0.16 130), oklch(0.78 0.18 130))",
              color: "#08080b", border: "none", borderRadius: 8, cursor: "pointer",
              opacity: loading ? 0.6 : 1,
            }}>
              {loading ? "Inviting…" : "Send invite"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function MembersPage() {
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  useEffect(() => { setCurrentUser(getUser()); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const canInvite = currentUser?.role === "owner" || currentUser?.role === "admin";
  const isOwner = currentUser?.role === "owner";

  function reload() {
    setLoading(true);
    membersApi.list().then(m => setMembers(m ?? [])).finally(() => setLoading(false));
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { reload(); }, []);

  async function changeRole(id: number, role: string) {
    try { await membersApi.updateRole(id, role); toast("Role updated"); reload(); }
    catch (err) { toast(err instanceof Error ? err.message : "Failed", "error"); }
  }

  async function remove(id: number) {
    if (!confirm("Remove this member?")) return;
    try { await membersApi.remove(id); toast("Member removed"); reload(); }
    catch (err) { toast(err instanceof Error ? err.message : "Failed", "error"); }
  }

  return (
    <div style={{ padding: "28px 32px", maxWidth: 900, margin: "0 auto", animation: "page-in 320ms cubic-bezier(0.2,0.7,0.2,1)" }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 28, gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-0.02em", margin: 0 }}>Members</h1>
          <p style={{ color: "var(--fg-dim)", fontSize: 13.5, marginTop: 4 }}>
            {members.length} member{members.length !== 1 ? "s" : ""}
          </p>
        </div>
        {canInvite && (
          <button onClick={() => setShowInvite(true)} style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "7px 14px", borderRadius: 8, fontSize: 13, fontWeight: 500,
            background: "linear-gradient(180deg, oklch(0.92 0.16 130), oklch(0.78 0.18 130))",
            color: "#08080b", border: "none", cursor: "pointer",
            boxShadow: "0 0 0 1px oklch(0.78 0.18 130), 0 8px 24px -8px var(--accent-glow)",
          }}>
            <UserPlus size={14}/> Invite member
          </button>
        )}
      </div>

      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--surface-2)", borderBottom: "1px solid var(--border)" }}>
              {["Member", "Role", "Joined", ...(isOwner ? ["Actions"] : [])].map((h, i, arr) => (
                <th key={h} style={{ textAlign: i === arr.length - 1 && isOwner ? "right" : "left", padding: "11px 16px", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--fg-dim)", fontWeight: 500 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                  {Array.from({ length: isOwner ? 4 : 3 }).map((_, j) => (
                    <td key={j} style={{ padding: "14px 16px" }}>
                      <div style={{ height: 12, background: "var(--surface-2)", borderRadius: 4 }}/>
                    </td>
                  ))}
                </tr>
              ))
            ) : members.map(m => (
              <tr key={m.id}
                style={{ borderBottom: "1px solid var(--border)", background: m.id === currentUser?.id ? "oklch(0.86 0.18 130 / 0.03)" : "transparent", transition: "background 140ms ease" }}
                onMouseEnter={e => (e.currentTarget.style.background = m.id === currentUser?.id ? "oklch(0.86 0.18 130 / 0.06)" : "var(--surface-2)")}
                onMouseLeave={e => (e.currentTarget.style.background = m.id === currentUser?.id ? "oklch(0.86 0.18 130 / 0.03)" : "transparent")}
              >
                <td style={{ padding: "14px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg, oklch(0.65 0.18 30), oklch(0.65 0.18 60))", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 600, color: "#08080b", flexShrink: 0 }}>
                      {m.email[0].toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, color: "var(--fg)" }}>{m.email}</div>
                      {m.id === currentUser?.id && <div style={{ fontSize: 11, color: "var(--fg-faint)" }}>You</div>}
                    </div>
                  </div>
                </td>
                <td style={{ padding: "14px 16px" }}>
                  {isOwner && m.id !== currentUser?.id ? (
                    <select value={m.role} onChange={e => changeRole(m.id, e.target.value)}
                      style={{ padding: "4px 8px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12, color: "var(--fg)", outline: "none" }}
                    >
                      {["viewer", "member", "admin", "owner"].map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  ) : <RoleBadge role={m.role}/>}
                </td>
                <td style={{ padding: "14px 16px", fontSize: 12, color: "var(--fg-dim)", fontFamily: "var(--font-mono)" }}>{m.created_at ? format(new Date(m.created_at), "MMM d, yyyy") : "—"}</td>
                {isOwner && (
                  <td style={{ padding: "14px 16px", textAlign: "right" }}>
                    {m.id !== currentUser?.id && (
                      <button onClick={() => remove(m.id)} style={{ background: "transparent", border: "none", color: "var(--fg-faint)", cursor: "pointer", transition: "color 140ms ease" }}
                        onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = "var(--sev-critical)")}
                        onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = "var(--fg-faint)")}
                      >
                        <Trash2 size={14}/>
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showInvite && <InviteModal onClose={() => setShowInvite(false)} onSuccess={reload}/>}
    </div>
  );
}
