"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { RefreshCw, Download, ChevronRight, Copy, Check, GitBranch, ArrowUp } from "lucide-react";
import { projectsApi, vulnApi } from "@/lib/api";
import type { Project, Vulnerability, ScanSummary } from "@/lib/types";
import { format, subDays } from "date-fns";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";

/* ── helpers ────────────────────────────────────────────────── */

function SevChip({ level }: { level: string }) {
  const cls = level === "CRITICAL" ? "critical" : level === "HIGH" ? "high" : level === "MEDIUM" ? "medium" : level === "LOW" ? "low" : "info";
  return <span className={`sev ${cls}`}>{level}</span>;
}

function PulseDot({ color = "var(--accent)" }: { color?: string }) {
  return (
    <span style={{
      width: 6, height: 6, borderRadius: "50%",
      background: color,
      display: "inline-block", position: "relative",
      boxShadow: `0 0 8px ${color}`,
    }}>
      <span style={{
        position: "absolute", inset: -3, borderRadius: "50%",
        border: `1px solid ${color}`,
        animation: "pulse 1.8s ease-out infinite",
      }}/>
    </span>
  );
}

function Sparkline({ values, color = "var(--accent)", width = 80, height = 28, id }: {
  values: number[]; color?: string; width?: number; height?: number; id?: string;
}) {
  if (!values.length) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={width} height={height} style={{ display: "block", overflow: "visible" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function CvssGauge({ value, size = 44 }: { value: number; size?: number }) {
  const color = value >= 9 ? "var(--sev-critical)" : value >= 7 ? "var(--sev-high)" : value >= 4 ? "var(--sev-medium)" : "var(--sev-low)";
  const pct = (value / 10) * 100;
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: `conic-gradient(${color} ${pct}%, var(--surface-3) 0)`,
      display: "grid", placeItems: "center", position: "relative", flexShrink: 0,
    }}>
      <div style={{ position: "absolute", inset: 5, borderRadius: "50%", background: "var(--surface)" }}/>
      <span style={{ position: "relative", fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600, color }}>{value.toFixed(1)}</span>
    </div>
  );
}

function SeverityBar({ counts }: { counts: { critical: number; high: number; medium: number; low: number } }) {
  const total = counts.critical + counts.high + counts.medium + counts.low || 1;
  const segs = [
    { key: "critical", v: counts.critical, color: "var(--sev-critical)" },
    { key: "high",     v: counts.high,     color: "var(--sev-high)" },
    { key: "medium",   v: counts.medium,   color: "var(--sev-medium)" },
    { key: "low",      v: counts.low,      color: "var(--sev-low)" },
  ];
  return (
    <div style={{ display: "flex", height: 4, borderRadius: 999, overflow: "hidden", gap: 1 }}>
      {segs.map(s => s.v > 0 && (
        <div key={s.key} style={{ flex: s.v / total, background: s.color }}/>
      ))}
    </div>
  );
}


/* ── Evolution chart (Recharts) ──────────────────────────────── */

const SEV_CSS: Record<string, string> = {
  critical: "oklch(0.65 0.24 22)",
  high:     "oklch(0.72 0.18 50)",
  medium:   "oklch(0.82 0.16 90)",
  low:      "oklch(0.70 0.14 245)",
};

function EvoTooltip({ active, payload, label }: { active?: boolean; payload?: { dataKey: string; name: string; color: string; value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#111114", border: "1px solid rgba(255,255,255,0.10)",
      borderRadius: 8, padding: "10px 14px",
      fontSize: 11, fontFamily: "var(--font-mono)",
      boxShadow: "0 8px 32px rgba(0,0,0,0.6)", minWidth: 130,
    }}>
      <div style={{ color: "#71717a", marginBottom: 8, fontSize: 10, letterSpacing: "0.05em" }}>{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: p.color, display: "inline-block", flexShrink: 0 }}/>
          <span style={{ flex: 1, color: "#a1a1aa" }}>{p.name}</span>
          <span style={{ color: p.value > 0 ? p.color : "#52525b", fontWeight: p.value > 0 ? 700 : 400 }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
}

interface EvoPoint { date: string; critical: number; high: number; medium: number; }

function EvoChart({ data, height = 220 }: { data: EvoPoint[]; height?: number }) {
  const maxVal = Math.max(...data.map(d => Math.max(d.critical, d.high, d.medium)), 1);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3"/>
        <XAxis dataKey="date" tick={{ fill: "#52525b", fontSize: 10, fontFamily: "monospace" }} axisLine={false} tickLine={false} interval="preserveStartEnd"/>
        <YAxis domain={[0, maxVal + 2]} tick={{ fill: "#52525b", fontSize: 10, fontFamily: "monospace" }} axisLine={false} tickLine={false} width={32} allowDecimals={false}/>
        <Tooltip content={<EvoTooltip/>} cursor={{ stroke: "rgba(255,255,255,0.08)", strokeWidth: 1 }}/>
        <Line type="monotone" dataKey="critical" name="Critical" stroke={SEV_CSS.critical} strokeWidth={2} dot={false} activeDot={{ r: 4, fill: SEV_CSS.critical }} isAnimationActive={false}/>
        <Line type="monotone" dataKey="high"     name="High"     stroke={SEV_CSS.high}     strokeWidth={2} dot={false} activeDot={{ r: 4, fill: SEV_CSS.high }}     isAnimationActive={false}/>
        <Line type="monotone" dataKey="medium"   name="Medium"   stroke={SEV_CSS.medium}   strokeWidth={2} dot={false} activeDot={{ r: 4, fill: SEV_CSS.medium }}   isAnimationActive={false}/>
      </LineChart>
    </ResponsiveContainer>
  );
}

/* ── Spotlight card ──────────────────────────────────────────── */

function Spotlight({ children, style, className }: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}) {
  const [pos, setPos] = useState({ x: "50%", y: "0%" });
  const [active, setActive] = useState(false);

  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setPos({
      x: ((e.clientX - rect.left) / rect.width * 100).toFixed(1) + "%",
      y: ((e.clientY - rect.top) / rect.height * 100).toFixed(1) + "%",
    });
  }, []);

  return (
    <div
      className={className}
      onMouseMove={onMove}
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 14,
        padding: 20,
        position: "relative",
        overflow: "hidden",
        ...style,
      }}
    >
      {active && (
        <div style={{
          position: "absolute", inset: -1, borderRadius: "inherit",
          background: `radial-gradient(400px circle at ${pos.x} ${pos.y}, rgba(255,255,255,0.07), transparent 50%)`,
          pointerEvents: "none",
        }}/>
      )}
      {children}
    </div>
  );
}

/* ── CopyButton ──────────────────────────────────────────────── */

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      style={{
        position: "absolute", top: 8, right: 8,
        width: 28, height: 28, display: "grid", placeItems: "center",
        borderRadius: 6, border: "1px solid var(--border)",
        background: "var(--surface-2)", color: "var(--fg-muted)", cursor: "pointer",
        transition: "all 140ms ease",
      }}
    >
      {copied ? <Check size={12} style={{ color: "var(--accent)" }}/> : <Copy size={12}/>}
    </button>
  );
}

/* ── Build chart data from scans ─────────────────────────────── */

function buildEvoData(allScans: ScanSummary[]) {
  const days = Array.from({ length: 14 }, (_, i) => subDays(new Date(), 13 - i));
  const sorted = [...allScans].sort((a, b) =>
    new Date(a.scanned_at).getTime() - new Date(b.scanned_at).getTime()
  );
  const lastKnown: Record<number, ScanSummary> = {};
  let scanIdx = 0;

  return days.map(day => {
    const dayEnd = format(day, "yyyy-MM-dd");
    while (scanIdx < sorted.length && sorted[scanIdx].scanned_at.slice(0, 10) <= dayEnd) {
      lastKnown[sorted[scanIdx].project_id] = sorted[scanIdx];
      scanIdx++;
    }
    const vals = Object.values(lastKnown);
    return {
      date: format(day, "MMM d"),
      critical: vals.reduce((s, v) => s + v.critical, 0),
      high:     vals.reduce((s, v) => s + v.high, 0),
      medium:   vals.reduce((s, v) => s + v.medium, 0),
    };
  });
}

function buildSparkValues(vulns: Vulnerability[], severity: string) {
  return Array.from({ length: 14 }, (_, i) => {
    const dateStr = format(subDays(new Date(), 13 - i), "yyyy-MM-dd");
    return vulns.filter(v => v.severity === severity && (v.first_seen_at?.slice(0, 10) ?? "9999") <= dateStr).length;
  });
}

/* ── Main page ───────────────────────────────────────────────── */

export default function OverviewPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [vulns, setVulns] = useState<Vulnerability[]>([]);
  const [allScans, setAllScans] = useState<ScanSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([projectsApi.list(), vulnApi.list(1, 500)])
      .then(async ([p, v]) => {
        const projectList = p ?? [];
        setProjects(projectList);
        setVulns(v?.data ?? []);
        // Load scans for all projects in parallel for the evolution chart
        const scanArrays = await Promise.all(
          projectList.map(proj => projectsApi.scans(proj.name).catch(() => []))
        );
        setAllScans(scanArrays.flat());
      })
      .finally(() => setLoading(false));
  }, []);

  const critical = vulns.filter(v => v.severity === "CRITICAL").length;
  const high     = vulns.filter(v => v.severity === "HIGH").length;
  const medium   = vulns.filter(v => v.severity === "MEDIUM").length;
  const low      = vulns.filter(v => v.severity === "LOW").length;
  const total    = critical + high + medium + low;
  const unfixed  = vulns.filter(v => !v.is_fixed).length;

  const evoData = buildEvoData(allScans);
  const sparkCritical = buildSparkValues(vulns, "CRITICAL");
  const sparkHigh     = buildSparkValues(vulns, "HIGH");
  const sparkMedium   = buildSparkValues(vulns, "MEDIUM");
  const sparkLow      = buildSparkValues(vulns, "LOW");

  const SEV_ORDER: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
  const topCves = [...vulns]
    .sort((a, b) => (SEV_ORDER[b.severity] ?? 0) - (SEV_ORDER[a.severity] ?? 0))
    .slice(0, 5);

  const topRisk = [...projects]
    .sort((a, b) => (b.critical * 10 + b.high * 3 + b.medium) - (a.critical * 10 + a.high * 3 + a.medium))
    .slice(0, 5);

  const kpis = [
    { eyebrow: "Total",    value: loading ? "—" : total,    label: "Vulnerabilities",   sub: `${projects.length} projects`,  spark: [...sparkCritical.map((v,i) => v + sparkHigh[i] + sparkMedium[i] + sparkLow[i])], color: "var(--fg-muted)" },
    { eyebrow: "Critical", value: loading ? "—" : critical, label: "Critical open",     sub: "Immediate action",             spark: sparkCritical, color: SEV_CSS.critical, alert: critical > 0 },
    { eyebrow: "High",     value: loading ? "—" : high,     label: "High severity",     sub: `${medium} medium · ${low} low`, spark: sparkHigh,    color: SEV_CSS.high },
    { eyebrow: "Unfixed",  value: loading ? "—" : unfixed,  label: "Awaiting fix",      sub: `${vulns.length - unfixed} resolved`, spark: sparkLow, color: "var(--fg-muted)" },
  ];

  const ciSnippet = `- name: "Scan with Trivy"
  uses: trivihub/scan-action@v1
  with:
    project: my-service
    api-key: \${{ secrets.TRIVIHUB_KEY }}`;

  const recentActivity = [
    { color: "var(--accent)",        text: "Scan completed on ",   target: projects[0]?.name ?? "—",    sub: "main branch · just now" },
    { color: "var(--sev-critical)",  text: "New Critical CVE: ",   target: "CVE-2024-32002",            sub: "Git RCE — review immediately" },
    { color: "var(--accent)",        text: "Fixed: ",              target: "CVE-2023-39325",            sub: "x/net upgraded" },
    { color: "var(--sev-high)",      text: "EPSS > 0.7: ",        target: "CVE-2024-21626",            sub: "runc container escape" },
    { color: "var(--fg-faint)",      text: "Scan completed on ",   target: projects[1]?.name ?? "—",    sub: "3 hours ago" },
  ];

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1480, margin: "0 auto", animation: "page-in 320ms cubic-bezier(0.2,0.7,0.2,1)" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 24, gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-0.02em", margin: 0 }}>Overview</h1>
          <p style={{ color: "var(--fg-dim)", fontSize: 13.5, marginTop: 4 }}>
            Global security posture · {projects.length} projects · last 14 days
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => window.location.reload()} style={btnGhost}>
            <RefreshCw size={13}/> Refresh
          </button>
          <button style={btnGhost}>
            <Download size={13}/> Export
          </button>
        </div>
      </div>

      {/* Bento grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 16 }}>

        {/* KPI cards */}
        {kpis.map((k, i) => (
          <Spotlight key={i} style={{ gridColumn: "span 3" }}>
            <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--fg-faint)", fontFamily: "var(--font-mono)", marginBottom: 8 }}>
              {k.eyebrow}
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 2 }}>
              <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: "-0.025em", lineHeight: 1, fontFeatureSettings: '"tnum"', color: k.alert ? k.color : "var(--fg)" }}>
                {k.value}
              </div>
              {k.alert && (
                <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", display: "inline-flex", alignItems: "center", gap: 3, padding: "2px 6px", borderRadius: 4, background: "oklch(0.65 0.24 22 / 0.12)", color: "var(--sev-critical)" }}>
                  <ArrowUp size={10}/>
                </span>
              )}
            </div>
            <div style={{ color: "var(--fg-dim)", fontSize: 12, marginTop: 8 }}>
              {k.label} · <span style={{ color: "var(--fg-faint)" }}>{k.sub}</span>
            </div>
            <div style={{ marginTop: 14 }}>
              <Sparkline values={k.spark} color={k.color} width={240} height={36}/>
            </div>
          </Spotlight>
        ))}

        {/* Evolution chart — full width */}
        <Spotlight style={{ gridColumn: "span 12" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, gap: 12 }}>
            <div>
              <div style={{ fontSize: 13, color: "var(--fg-muted)", fontWeight: 500 }}>Vulnerability evolution</div>
              <div style={{ fontSize: 11.5, color: "var(--fg-dim)", marginTop: 2 }}>
                Active vulnerabilities per project scan · stacked by severity · last 14 days
              </div>
            </div>
            <div style={{ display: "flex", gap: 14 }}>
              {(["critical","high","medium"] as const).map(k => (
                <div key={k} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--fg-muted)" }}>
                  <span style={{ width: 16, height: 2, borderRadius: 999, background: SEV_CSS[k], display: "inline-block" }}/>
                  <span style={{ fontFamily: "var(--font-mono)", textTransform: "capitalize" }}>{k}</span>
                </div>
              ))}
            </div>
          </div>
          {loading
            ? <div style={{ height: 240, background: "var(--surface-2)", borderRadius: 8 }}/>
            : allScans.length === 0
              ? (
                <div style={{ height: 240, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, color: "var(--fg-dim)", fontSize: 13 }}>
                  <div style={{ fontSize: 28, opacity: 0.3 }}>📡</div>
                  <div>No scan data yet</div>
                  <div style={{ fontSize: 11, color: "var(--fg-faint)", fontFamily: "var(--font-mono)" }}>Push a Trivy report to start tracking evolution</div>
                </div>
              )
              : <EvoChart data={evoData} height={240}/>
          }
        </Spotlight>

        {/* Severity breakdown */}
        <Spotlight style={{ gridColumn: "span 4" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <span style={{ fontSize: 13, color: "var(--fg-muted)", fontWeight: 500 }}>By severity</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-dim)" }}>{total} total</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {([
              { label: "Critical", v: critical, color: SEV_CSS.critical },
              { label: "High",     v: high,     color: SEV_CSS.high },
              { label: "Medium",   v: medium,   color: SEV_CSS.medium },
              { label: "Low",      v: low,      color: SEV_CSS.low },
            ]).map(s => {
              const pct = total ? (s.v / total) * 100 : 0;
              return (
                <div key={s.label} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: s.color, display: "inline-block" }}/>
                      {s.label}
                    </div>
                    <span style={{ fontFamily: "var(--font-mono)" }}>
                      {s.v} <span style={{ color: "var(--fg-faint)" }}>· {pct.toFixed(0)}%</span>
                    </span>
                  </div>
                  <div style={{ height: 5, background: "var(--surface-3)", borderRadius: 999, overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: s.color, transition: "width 600ms cubic-bezier(0.2,0.7,0.2,1)" }}/>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ height: 1, background: "var(--border)", margin: "16px 0" }}/>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div>
              <div style={{ color: "var(--fg-dim)", fontSize: 11 }}>Unfixed</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 600, marginTop: 2, color: "var(--sev-critical)" }}>{unfixed}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ color: "var(--fg-dim)", fontSize: 11 }}>Fixed</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 600, marginTop: 2, color: "var(--accent)" }}>{vulns.length - unfixed}</div>
            </div>
          </div>
        </Spotlight>

        {/* Projects health */}
        <Spotlight style={{ gridColumn: "span 7" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <span style={{ fontSize: 13, color: "var(--fg-muted)", fontWeight: 500 }}>Project health</span>
            <Link href="/dashboard/projects" style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--fg-muted)", background: "transparent", border: "none", cursor: "pointer", textDecoration: "none" }}>
              View all <ChevronRight size={12}/>
            </Link>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {loading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} style={{ height: 48, background: "var(--surface-2)", borderRadius: 8 }}/>
                ))
              : topRisk.length === 0
                ? <div style={{ padding: "24px 0", textAlign: "center", color: "var(--fg-dim)", fontSize: 13 }}>No projects yet</div>
                : topRisk.map(p => {
                    const total = p.critical + p.high + p.medium + p.low;
                    const delta = 0;
                    return (
                      <Link
                        key={p.id}
                        href={`/dashboard/projects/${encodeURIComponent(p.name)}`}
                        style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 8px", borderRadius: 8, cursor: "pointer", textDecoration: "none", transition: "background 140ms ease" }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--surface-2)"}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
                      >
                        <div style={{ width: 24, height: 24, borderRadius: 6, background: p.critical > 0 ? "linear-gradient(135deg, oklch(0.65 0.24 22), oklch(0.65 0.24 40))" : "linear-gradient(135deg, oklch(0.65 0.20 280), oklch(0.65 0.20 240))", flexShrink: 0 }}/>
                        <div style={{ minWidth: 160 }}>
                          <div style={{ fontSize: 13, color: "var(--fg)" }}>{p.name}</div>
                          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--fg-dim)" }}>{p.environment ?? "—"}</div>
                        </div>
                        <div style={{ flex: 1, padding: "0 12px" }}>
                          <SeverityBar counts={{ critical: p.critical, high: p.high, medium: p.medium, low: p.low }}/>
                          <div style={{ display: "flex", gap: 10, marginTop: 5, fontSize: 10.5, fontFamily: "var(--font-mono)" }}>
                            {p.critical > 0 && <span style={{ color: "var(--sev-critical)" }}>{p.critical} crit</span>}
                            {p.high > 0 && <span style={{ color: "var(--sev-high)" }}>{p.high} high</span>}
                            {p.medium > 0 && <span style={{ color: "var(--fg-dim)" }}>{p.medium} med</span>}
                          </div>
                        </div>
                        <ChevronRight size={12} style={{ color: "var(--fg-faint)", flexShrink: 0 }}/>
                      </Link>
                    );
                  })
            }
          </div>
        </Spotlight>

        {/* Activity */}
        <Spotlight style={{ gridColumn: "span 5" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <span style={{ fontSize: 13, color: "var(--fg-muted)", fontWeight: 500 }}>Recent activity</span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <PulseDot/>
              <span style={{ fontSize: 11, color: "var(--fg-dim)" }}>live</span>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {recentActivity.filter(a => a.target && a.target !== "—").map((a, i) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <div style={{
                  width: 8, height: 8, borderRadius: "50%", background: a.color, marginTop: 5, flexShrink: 0,
                  boxShadow: a.color === "var(--sev-critical)" ? `0 0 8px ${a.color}` : "none",
                }}/>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5 }}>
                    <span style={{ color: "var(--fg-dim)" }}>{a.text}</span>
                    <span style={{ fontFamily: "var(--font-mono)", color: "var(--fg)" }}>{a.target}</span>
                  </div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--fg-faint)", marginTop: 2 }}>{a.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </Spotlight>

        {/* Top CVEs */}
        <Spotlight style={{ gridColumn: "span 7" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <span style={{ fontSize: 13, color: "var(--fg-muted)", fontWeight: 500 }}>Top vulnerabilities · CVSS</span>
            <Link href="/dashboard/vulnerabilities" style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--fg-muted)", textDecoration: "none" }}>
              View all <ChevronRight size={12}/>
            </Link>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {loading
              ? Array.from({ length: 5 }).map((_, i) => <div key={i} style={{ height: 44, background: "var(--surface-2)", borderRadius: 8 }}/>)
              : topCves.length === 0
                ? <div style={{ padding: "24px 0", textAlign: "center", color: "var(--fg-dim)", fontSize: 13 }}>No CVEs found</div>
                : topCves.map(v => (
                    <Link
                      key={v.id}
                      href={`/dashboard/vulnerabilities/${encodeURIComponent(v.cve_id)}`}
                      style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 8px", borderRadius: 8, cursor: "pointer", textDecoration: "none", transition: "background 140ms ease" }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--surface-2)"}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
                    >
                      {v.cvss_score != null
                        ? <CvssGauge value={v.cvss_score} size={40}/>
                        : <SevChip level={v.severity}/>}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, color: "var(--fg)" }}>{v.cve_id}</span>
                          <SevChip level={v.severity}/>
                        </div>
                        <div style={{ fontSize: 12, color: "var(--fg-dim)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 2 }}>
                          {v.title ?? v.package_name}
                        </div>
                      </div>
                      <ChevronRight size={12} style={{ color: "var(--fg-faint)", flexShrink: 0 }}/>
                    </Link>
                  ))
            }
          </div>
        </Spotlight>

        {/* CI/CD snippet */}
        <Spotlight style={{ gridColumn: "span 5" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <span style={{ fontSize: 13, color: "var(--fg-muted)", fontWeight: 500 }}>CI/CD pipeline</span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <PulseDot color="var(--accent)"/>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-dim)" }}>connected</span>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: "#0d1117", display: "grid", placeItems: "center", border: "1px solid var(--border)" }}>
                  <GitBranch size={13} style={{ color: "var(--fg-muted)" }}/>
                </div>
                <div>
                  <div style={{ fontSize: 13 }}>GitHub Actions</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-faint)" }}>trigger=push</div>
                </div>
              </div>
              <span className="sev info" style={{ fontSize: 10 }}>linked</span>
            </div>
            <div style={{ height: 1, background: "var(--border)" }}/>
            <div style={{
              background: "#050507",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: "14px 16px",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: "var(--fg-muted)",
              lineHeight: 1.7,
              position: "relative",
            }}>
              <span style={{ color: "var(--fg-faint)", fontStyle: "italic" }}># trivihub-scan.yml</span>{"\n"}
              <span style={{ color: "oklch(0.78 0.16 280)" }}>- name</span>{": "}
              <span style={{ color: "oklch(0.85 0.16 130)" }}>&quot;Scan with Trivy&quot;</span>{"\n"}
              {"  "}<span style={{ color: "oklch(0.78 0.16 280)" }}>uses</span>{": "}
              <span style={{ color: "oklch(0.85 0.16 130)" }}>trivihub/scan-action@v1</span>{"\n"}
              {"  "}<span style={{ color: "oklch(0.78 0.16 280)" }}>with</span>:{"\n"}
              {"    "}<span style={{ color: "oklch(0.78 0.16 280)" }}>api-key</span>{": "}
              <span style={{ color: "oklch(0.85 0.10 200)" }}>{"${{ secrets.TRIVIHUB_KEY }}"}</span>
              <CopyButton text={ciSnippet}/>
            </div>
          </div>
        </Spotlight>

      </div>
    </div>
  );
}

/* ── Button styles ───────────────────────────────────────────── */

const btnGhost: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6,
  padding: "7px 12px", borderRadius: 8, fontSize: 13, fontWeight: 500,
  border: "1px solid transparent", background: "transparent",
  color: "var(--fg-muted)", cursor: "pointer", transition: "all 160ms ease",
  fontFamily: "var(--font-sans)",
};

