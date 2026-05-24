"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, FolderGit2, ShieldAlert, Users, Key,
  LogOut, Settings, ChevronsUpDown, Bell, Plug
} from "lucide-react";
import { clearAuth, getUser } from "@/lib/auth";
import type { User } from "@/lib/types";

const NAV_GROUPS = [
  {
    label: "Workspace",
    items: [
      { href: "/dashboard",                  label: "Overview",       icon: LayoutDashboard },
      { href: "/dashboard/vulnerabilities",  label: "CVEs",           icon: ShieldAlert },
      { href: "/dashboard/projects",         label: "Projects",       icon: FolderGit2 },
      { href: "/dashboard/notifications",    label: "Notifications",  icon: Bell },
      { href: "/dashboard/members",          label: "Members",        icon: Users },
    ],
  },
  {
    label: "Account",
    items: [
      { href: "/dashboard/api-keys",        label: "API Keys",         icon: Key },
      { href: "/dashboard/integrate",       label: "CI/CD Setup",      icon: Plug },
      { href: "/dashboard/settings",        label: "Settings",         icon: Settings },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => { setUser(getUser()); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function logout() { clearAuth(); router.push("/login"); }

  const initials = user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : "?";

  return (
    <aside style={{
      width: 240,
      background: "linear-gradient(180deg, rgba(255,255,255,0.015), transparent 30%), var(--bg-elev)",
      borderRight: "1px solid var(--border)",
      display: "flex",
      flexDirection: "column",
      padding: "16px 12px",
      gap: 4,
      position: "sticky",
      top: 0,
      height: "100vh",
      flexShrink: 0,
    }}>
      {/* Brand */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 8px 14px" }}>
        <div style={{
          width: 28, height: 28,
          borderRadius: 8,
          background: "linear-gradient(135deg, var(--accent), var(--violet))",
          display: "grid", placeItems: "center",
          color: "#08080b",
          fontWeight: 700,
          fontFamily: "var(--font-mono)",
          fontSize: 13,
          boxShadow: "0 0 24px var(--accent-glow)",
          position: "relative",
          overflow: "hidden",
          flexShrink: 0,
        }}>
          T
          <span style={{
            position: "absolute", inset: 0,
            background: "conic-gradient(from 0deg, transparent, rgba(255,255,255,0.18), transparent 30%)",
            animation: "brand-spin 4s linear infinite",
          }}/>
        </div>
        <span style={{ fontWeight: 600, letterSpacing: "-0.01em", fontSize: 15, color: "var(--fg)" }}>
          Trivihub
        </span>
      </div>

      {/* Project switcher */}
      <div
        onClick={() => router.push("/dashboard/projects")}
        style={{
          margin: "0 4px 12px",
          border: "1px solid var(--border)",
          borderRadius: 10,
          padding: "8px 10px",
          display: "flex", alignItems: "center", gap: 8,
          background: "var(--surface)",
          cursor: "pointer",
          transition: "border-color 160ms ease, background 160ms ease",
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.borderColor = "var(--border-bright)";
          (e.currentTarget as HTMLElement).style.background = "var(--surface-2)";
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
          (e.currentTarget as HTMLElement).style.background = "var(--surface)";
        }}
      >
        <div style={{
          width: 22, height: 22, borderRadius: 6,
          background: "linear-gradient(135deg, oklch(0.65 0.20 280), oklch(0.65 0.20 240))",
          flexShrink: 0,
        }}/>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: "var(--fg)" }}>All projects</div>
          <div style={{ fontSize: 11, color: "var(--fg-dim)", fontFamily: "var(--font-mono)" }}>main</div>
        </div>
        <ChevronsUpDown size={14} style={{ color: "var(--fg-faint)", flexShrink: 0 }}/>
      </div>

      {/* Nav groups */}
      {NAV_GROUPS.map((group) => (
        <div key={group.label}>
          <div style={{
            fontSize: 10.5,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "var(--fg-faint)",
            padding: "14px 10px 6px",
            fontWeight: 500,
          }}>
            {group.label}
          </div>
          {group.items.map(({ href, label, icon: Icon, badge = undefined, badgeCrit = false }: { href: string; label: string; icon: React.ElementType; badge?: string; badgeCrit?: boolean }) => {
            const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "7px 10px",
                  borderRadius: 8,
                  fontSize: 13.5,
                  color: active ? "var(--fg)" : "var(--fg-muted)",
                  background: active ? "linear-gradient(180deg, var(--surface-2), var(--surface))" : "transparent",
                  boxShadow: active ? "inset 0 0 0 1px var(--border-strong)" : "none",
                  transition: "all 140ms ease",
                  textDecoration: "none",
                  position: "relative",
                  userSelect: "none",
                }}
                onMouseEnter={e => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.color = "var(--fg)";
                    (e.currentTarget as HTMLElement).style.background = "var(--surface)";
                  }
                }}
                onMouseLeave={e => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.color = "var(--fg-muted)";
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                  }
                }}
              >
                {active && (
                  <span style={{
                    position: "absolute", left: -12, top: 8, bottom: 8, width: 2,
                    background: "var(--accent)",
                    borderRadius: 2,
                    boxShadow: "0 0 8px var(--accent-glow)",
                  }}/>
                )}
                <Icon size={16} style={{ flexShrink: 0, opacity: 0.85 }}/>
                <span style={{ flex: 1 }}>{label}</span>
                {badge && (
                  <span style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    padding: "2px 6px",
                    borderRadius: 4,
                    background: badgeCrit ? "oklch(0.65 0.24 22 / 0.16)" : "var(--surface-3)",
                    color: badgeCrit ? "var(--sev-critical)" : "var(--fg-muted)",
                  }}>
                    {badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      ))}

      {/* Footer */}
      <div style={{
        marginTop: "auto",
        paddingTop: 12,
        borderTop: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: "50%",
          background: "linear-gradient(135deg, oklch(0.65 0.18 30), oklch(0.65 0.18 60))",
          display: "grid", placeItems: "center",
          fontSize: 11, fontWeight: 600, color: "#08080b",
          flexShrink: 0,
        }}>
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12.5, color: "var(--fg)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {user?.email ?? ""}
          </div>
          <div style={{ fontSize: 11, color: "var(--fg-dim)" }}>
            {user?.role ?? ""}
          </div>
        </div>
        <button
          onClick={logout}
          title="Logout"
          style={{
            width: 28, height: 28,
            display: "grid", placeItems: "center",
            borderRadius: 7,
            border: "1px solid transparent",
            color: "var(--fg-muted)",
            transition: "all 140ms ease",
            cursor: "pointer",
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = "var(--surface)";
            (e.currentTarget as HTMLElement).style.color = "var(--fg)";
            (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = "transparent";
            (e.currentTarget as HTMLElement).style.color = "var(--fg-muted)";
            (e.currentTarget as HTMLElement).style.borderColor = "transparent";
          }}
        >
          <LogOut size={14}/>
        </button>
      </div>
    </aside>
  );
}
