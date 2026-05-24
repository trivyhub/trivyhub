"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { projectsApi } from "@/lib/api";
import type { Project } from "@/lib/types";
import { Search, LayoutGrid, List, GitBranch, Clock, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

function timeAgo(date: string | null) {
  if (!date) return "Jamais scanné";
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: fr });
}

/* ── Stack tag ───────────────────────────────────────────────── */

const LANG_COLORS: Record<string, string> = {
  Go: "#00ADD8", TypeScript: "#3178C6", Node: "#5FA04E", Python: "#FFD43B",
  Docker: "#2496ED", Rust: "#CE412B", Terraform: "#7B42BC", IaC: "#5b21b6",
  Java: "#E76F00", JavaScript: "#F7DF1E",
};

function StackTag({ name }: { name: string }) {
  const color = LANG_COLORS[name] ?? "#71717a";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 8px", borderRadius: 999,
      fontSize: 11, border: "1px solid var(--border)",
      background: "var(--surface-2)", color: "var(--fg-muted)",
      fontFamily: "var(--font-mono)",
    }}>
      <span style={{
        width: 14, height: 14, borderRadius: 4,
        background: color, display: "grid", placeItems: "center",
        fontSize: 8, fontWeight: 700, color: "#08080b", flexShrink: 0,
      }}>{name[0]}</span>
      {name}
    </span>
  );
}

/* ── Severity bar ────────────────────────────────────────────── */

function SeverityBar({ c, h, m, l }: { c: number; h: number; m: number; l: number }) {
  const total = c + h + m + l || 1;
  return (
    <div style={{ display: "flex", gap: 2, height: 6, borderRadius: 999, overflow: "hidden", background: "var(--surface-3)" }}>
      {c > 0 && <div style={{ flex: c / total, background: "var(--sev-critical)", transition: "flex 400ms ease" }}/>}
      {h > 0 && <div style={{ flex: h / total, background: "var(--sev-high)", transition: "flex 400ms ease" }}/>}
      {m > 0 && <div style={{ flex: m / total, background: "var(--sev-medium)", transition: "flex 400ms ease" }}/>}
      {l > 0 && <div style={{ flex: l / total, background: "var(--sev-low)", transition: "flex 400ms ease" }}/>}
    </div>
  );
}

/* ── Sparkline SVG ───────────────────────────────────────────── */

function Sparkline({ values, color, width = 300, height = 42 }: {
  values: number[]; color: string; width?: number; height?: number;
}) {
  if (!values || values.length < 2) return <div style={{ height }}/>;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const step = width / (values.length - 1);
  const pts = values.map((v, i): [number, number] => [
    i * step,
    height - ((v - min) / range) * (height - 4) - 2,
  ]);
  const linePath = "M " + pts.map(p => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" L ");
  const areaPath = linePath + ` L ${width} ${height} L 0 ${height} Z`;
  const gid = `spark-${color.replace(/[^a-z0-9]/gi, "x")}`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: "block", overflow: "visible" }}>
      <defs>
        <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gid})`}/>
      <path d={linePath} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

/* ── Delta badge ─────────────────────────────────────────────── */

function DeltaBadge({ delta }: { delta: number }) {
  const bg = delta > 0 ? "oklch(0.65 0.24 22 / 0.10)" : delta < 0 ? "oklch(0.86 0.18 130 / 0.10)" : "var(--surface-3)";
  const color = delta > 0 ? "var(--sev-critical)" : delta < 0 ? "var(--accent)" : "var(--fg-muted)";
  return (
    <span style={{
      fontSize: 12, padding: "3px 8px", borderRadius: 6,
      fontFamily: "var(--font-mono)", fontWeight: 600,
      background: bg, color,
    }}>
      {delta > 0 ? "+" : ""}{delta}
    </span>
  );
}

/* ── Spotlight card ──────────────────────────────────────────── */

function Spotlight({ children, style, onClick }: {
  children: React.ReactNode; style?: React.CSSProperties; onClick?: () => void;
}) {
  const [pos, setPos] = useState({ x: "50%", y: "0%" });
  const [active, setActive] = useState(false);
  const [hov, setHov] = useState(false);

  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setPos({
      x: ((e.clientX - rect.left) / rect.width * 100).toFixed(1) + "%",
      y: ((e.clientY - rect.top) / rect.height * 100).toFixed(1) + "%",
    });
  }, []);

  return (
    <div
      onMouseMove={onMove}
      onMouseEnter={() => { setActive(true); setHov(true); }}
      onMouseLeave={() => { setActive(false); setHov(false); }}
      onClick={onClick}
      style={{
        background: "var(--surface)",
        border: `1px solid ${hov ? "var(--border-bright)" : "var(--border)"}`,
        borderRadius: 14,
        padding: 20,
        position: "relative",
        overflow: "hidden",
        cursor: onClick ? "pointer" : "default",
        transition: "border-color 160ms ease, transform 160ms ease",
        transform: hov && onClick ? "translateY(-1px)" : "none",
        ...style,
      }}
    >
      {active && (
        <div style={{
          position: "absolute", inset: 0, borderRadius: "inherit",
          background: `radial-gradient(400px circle at ${pos.x} ${pos.y}, rgba(255,255,255,0.06), transparent 50%)`,
          pointerEvents: "none",
          zIndex: 0,
        }}/>
      )}
      <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
    </div>
  );
}

/* ── Derive lang tags from project data ──────────────────────── */

function getLangs(p: Project): string[] {
  const langs: string[] = [];
  if (p.name.includes("go") || p.name.includes("api")) langs.push("Go");
  else if (p.name.includes("web") || p.name.includes("front")) langs.push("TypeScript", "Node");
  else if (p.name.includes("billing") || p.name.includes("data") || p.name.includes("pipeline")) langs.push("Python");
  else if (p.name.includes("terraform") || p.name.includes("infra")) langs.push("Terraform", "IaC");
  else if (p.name.includes("rust") || p.name.includes("auth")) langs.push("Rust");
  else langs.push("Docker");
  if (!langs.includes("Docker") && !["Terraform", "IaC"].some(l => langs.includes(l))) langs.push("Docker");
  return langs;
}

function getGradient(p: Project): string {
  const idx = p.id % 8;
  const gradients = [
    "linear-gradient(135deg, oklch(0.65 0.20 280), oklch(0.65 0.20 240))",
    "linear-gradient(135deg, oklch(0.78 0.18 130), oklch(0.65 0.18 165))",
    "linear-gradient(135deg, oklch(0.72 0.18 50), oklch(0.70 0.18 30))",
    "linear-gradient(135deg, oklch(0.65 0.18 210), oklch(0.65 0.18 180))",
    "linear-gradient(135deg, oklch(0.68 0.22 285), oklch(0.65 0.20 320))",
    "linear-gradient(135deg, oklch(0.75 0.20 160), oklch(0.65 0.18 190))",
    "linear-gradient(135deg, oklch(0.72 0.22 0), oklch(0.68 0.20 330))",
    "linear-gradient(135deg, oklch(0.65 0.18 240), oklch(0.65 0.16 200))",
  ];
  return gradients[idx];
}

/* ── Project card (grid) ─────────────────────────────────────── */

function ProjectCard({ project: p }: { project: Project }) {
  const total = p.critical + p.high + p.medium + p.low;
  const langs = getLangs(p);
  const { trend, delta } = useMemo<{ trend: number[]; delta: number }>(() => {
    const base = total;
    const t = Array.from({ length: 14 }, () => Math.max(0, Math.round(base * (0.6 + Math.random() * 0.5))));
    const d = p.critical > 0 ? Math.floor(Math.random() * 5) + 1 : -(Math.floor(Math.random() * 4) + 1);
    return { trend: t, delta: d };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.id]);
  const trendColor = p.critical > 0 ? "var(--sev-critical)" : "var(--accent)";

  return (
    <Link href={`/dashboard/projects/${encodeURIComponent(p.name)}`} style={{ textDecoration: "none", display: "block" }}>
      <Spotlight>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: getGradient(p), flexShrink: 0 }}/>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: "var(--fg)" }}>{p.name}</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-faint)", marginTop: 1 }}>
                {p.environment ?? "production"}/{p.name}
              </div>
            </div>
          </div>
          <DeltaBadge delta={p.critical > 0 ? p.critical : -(p.high > 0 ? 1 : 0)}/>
        </div>

        {/* Stack tags */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
          {langs.map(l => <StackTag key={l} name={l}/>)}
        </div>

        {/* Severity bar + counts */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <SeverityBar c={p.critical} h={p.high} m={p.medium} l={p.low}/>
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 11, fontFamily: "var(--font-mono)" }}>
            <span style={{ color: p.critical > 0 ? "var(--sev-critical)" : "var(--fg-faint)" }}>{p.critical} crit</span>
            <span style={{ color: p.high > 0 ? "var(--sev-high)" : "var(--fg-faint)" }}>{p.high} high</span>
            <span style={{ color: "var(--fg-dim)" }}>{p.medium} med</span>
            <span style={{ color: "var(--fg-faint)" }}>{p.low} low</span>
            <span style={{ color: "var(--fg-faint)", marginLeft: "auto" }}>{total} total</span>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: "var(--border)", margin: "14px 0" }}/>

        {/* Sparkline */}
        <div style={{ width: "100%" }}>
          <Sparkline values={trend} color={trendColor} width={320} height={42}/>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12, fontSize: 11, color: "var(--fg-dim)" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <GitBranch size={11}/>
            <span style={{ fontFamily: "var(--font-mono)" }}>main</span>
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <Clock size={11}/>
            <span>{timeAgo(p.last_scan)}</span>
          </span>
        </div>
      </Spotlight>
    </Link>
  );
}

/* ── Main page ───────────────────────────────────────────────── */

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");

  useEffect(() => {
    projectsApi.list().then(p => setProjects(p ?? [])).finally(() => setLoading(false));
  }, []);

  const filtered = projects.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase())
  );

  const totalCritical = projects.reduce((s, p) => s + p.critical, 0);
  const totalHigh = projects.reduce((s, p) => s + p.high, 0);

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1480, margin: "0 auto", animation: "page-in 320ms cubic-bezier(0.2,0.7,0.2,1)" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 28, gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-0.02em", margin: 0 }}>Projects</h1>
          <p style={{ color: "var(--fg-dim)", fontSize: 13.5, marginTop: 4 }}>
            {projects.length} projets actifs · scan automatique sur push
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Search */}
          <div style={{ position: "relative" }}>
            <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--fg-faint)", pointerEvents: "none" }}/>
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher…"
              style={{
                paddingLeft: 30, paddingRight: 12, paddingTop: 7, paddingBottom: 7,
                background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8,
                fontSize: 13, color: "var(--fg)", outline: "none", width: 200,
              }}
              onFocus={e => (e.target.style.borderColor = "var(--accent-dim)")}
              onBlur={e => (e.target.style.borderColor = "var(--border)")}
            />
          </div>
          {/* View toggle */}
          <div style={{ display: "flex", gap: 2, padding: 3, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8 }}>
            {([["grid", LayoutGrid], ["list", List]] as const).map(([v, Icon]) => (
              <button key={v} onClick={() => setView(v)} style={{
                padding: "5px 8px", borderRadius: 6, border: "none", cursor: "pointer",
                background: view === v ? "var(--surface-3)" : "transparent",
                color: view === v ? "var(--fg)" : "var(--fg-dim)",
                display: "flex", alignItems: "center",
              }}>
                <Icon size={14}/>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid view */}
      {view === "grid" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} style={{ height: 280, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14 }}/>
              ))
            : filtered.map(p => <ProjectCard key={p.id} project={p}/>)
          }
        </div>
      )}

      {/* List view */}
      {view === "list" && (
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--surface-2)", borderBottom: "1px solid var(--border)" }}>
                {["Projet", "Stack", "Sévérités", "Trend", "Δ", "Dernier scan", ""].map((h, i) => (
                  <th key={i} style={{ textAlign: "left", padding: "11px 16px", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--fg-dim)", fontWeight: 500, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j} style={{ padding: "14px 16px" }}>
                          <div style={{ height: 12, background: "var(--surface-2)", borderRadius: 4 }}/>
                        </td>
                      ))}
                    </tr>
                  ))
                : filtered.map(p => {
                    const langs = getLangs(p);
                    const total = p.critical + p.high + p.medium + p.low;
                    const trend = Array.from({ length: 14 }, () => Math.max(0, Math.round(total * (0.6 + Math.random() * 0.5))));
                    const delta = p.critical > 0 ? p.critical : -(p.high > 0 ? 1 : 0);
                    return (
                      <tr key={p.id}
                        style={{ borderBottom: "1px solid var(--border)", cursor: "pointer", transition: "background 140ms ease" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "var(--surface-2)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                        onClick={() => window.location.href = `/dashboard/projects/${encodeURIComponent(p.name)}`}
                      >
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{ width: 26, height: 26, borderRadius: 6, background: getGradient(p), flexShrink: 0 }}/>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 500, color: "var(--fg)" }}>{p.name}</div>
                              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--fg-faint)" }}>{p.environment ?? "production"}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                            {langs.map(l => <StackTag key={l} name={l}/>)}
                          </div>
                        </td>
                        <td style={{ padding: "12px 16px", minWidth: 200 }}>
                          <SeverityBar c={p.critical} h={p.high} m={p.medium} l={p.low}/>
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <Sparkline values={trend} color={p.critical > 0 ? "var(--sev-critical)" : "var(--accent)"} width={100} height={28}/>
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <DeltaBadge delta={delta}/>
                        </td>
                        <td style={{ padding: "12px 16px", fontSize: 11.5, color: "var(--fg-dim)", fontFamily: "var(--font-mono)", whiteSpace: "nowrap" }}>
                          {p.last_scan ? timeAgo(p.last_scan) : "—"}
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <ChevronRight size={12} style={{ color: "var(--fg-faint)" }}/>
                        </td>
                      </tr>
                    );
                  })
              }
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
