"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ChevronRight, GitBranch, Clock, ArrowUp, ArrowDown, Minus, ExternalLink } from "lucide-react";
import { projectsApi } from "@/lib/api";
import type { Project, Vulnerability, ScanSummary } from "@/lib/types";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

/* ── helpers ─────────────────────────────────────────────────── */

function timeAgo(date: string) {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: fr });
}

const LANG_COLORS: Record<string, string> = {
  Go: "#00ADD8", TypeScript: "#3178C6", Node: "#5FA04E", Python: "#FFD43B",
  Docker: "#2496ED", Rust: "#CE412B", Terraform: "#7B42BC", IaC: "#5b21b6",
  Java: "#E76F00", JavaScript: "#F7DF1E", "C#": "#9B4F96", Ruby: "#CC342D",
  PHP: "#777BB4", Swift: "#FA7343",
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
      <span style={{ width: 14, height: 14, borderRadius: 4, background: color, display: "grid", placeItems: "center", fontSize: 8, fontWeight: 700, color: "#08080b", flexShrink: 0 }}>
        {name[0]}
      </span>
      {name}
    </span>
  );
}

/* ── shared helpers ──────────────────────────────────────────── */

function SevChip({ level }: { level: string }) {
  const cls = level === "CRITICAL" ? "critical" : level === "HIGH" ? "high" : level === "MEDIUM" ? "medium" : level === "LOW" ? "low" : "info";
  return <span className={`sev ${cls}`}>{level}</span>;
}

function Spotlight({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  const [pos, setPos] = useState({ x: "50%", y: "0%" });
  const [active, setActive] = useState(false);
  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setPos({ x: ((e.clientX - r.left) / r.width * 100).toFixed(1) + "%", y: ((e.clientY - r.top) / r.height * 100).toFixed(1) + "%" });
  }, []);
  return (
    <div onMouseMove={onMove} onMouseEnter={() => setActive(true)} onMouseLeave={() => setActive(false)}
      style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 20, position: "relative", overflow: "hidden", ...style }}>
      {active && <div style={{ position: "absolute", inset: 0, borderRadius: "inherit", background: `radial-gradient(400px circle at ${pos.x} ${pos.y}, rgba(255,255,255,0.06), transparent 50%)`, pointerEvents: "none", zIndex: 0 }}/>}
      <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
    </div>
  );
}

/* ── Evolution chart (line, per-project) ─────────────────────── */

const SEV_CSS = {
  critical: "oklch(0.65 0.24 22)",
  high:     "oklch(0.72 0.18 50)",
  medium:   "oklch(0.82 0.16 90)",
};

function EvoTooltip({ active, payload, label }: { active?: boolean; payload?: { dataKey: string; name: string; color: string; value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#111114", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 8, padding: "10px 14px", fontSize: 11, fontFamily: "var(--font-mono)", boxShadow: "0 8px 32px rgba(0,0,0,0.6)", minWidth: 130 }}>
      <div style={{ color: "#71717a", marginBottom: 8, fontSize: 10 }}>{label}</div>
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

function ProjectEvoChart({ scans, height = 200 }: { scans: ScanSummary[]; height?: number }) {
  if (scans.length === 0) return (
    <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--fg-dim)", fontSize: 13 }}>
      Pas encore assez de scans
    </div>
  );
  // One point per scan, oldest first
  const data = [...scans].reverse().map(s => ({
    date: format(new Date(s.scanned_at), "MMM d"),
    critical: s.critical,
    high:     s.high,
    medium:   s.medium,
  }));
  const maxVal = Math.max(...data.map(d => Math.max(d.critical, d.high, d.medium)), 1);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3"/>
        <XAxis dataKey="date" tick={{ fill: "#52525b", fontSize: 10, fontFamily: "monospace" }} axisLine={false} tickLine={false} interval="preserveStartEnd"/>
        <YAxis domain={[0, maxVal + 2]} tick={{ fill: "#52525b", fontSize: 10, fontFamily: "monospace" }} axisLine={false} tickLine={false} width={28} allowDecimals={false}/>
        <Tooltip content={<EvoTooltip/>} cursor={{ stroke: "rgba(255,255,255,0.08)", strokeWidth: 1 }}/>
        <Line type="monotone" dataKey="critical" name="Critical" stroke={SEV_CSS.critical} strokeWidth={2} dot={false} activeDot={{ r: 4 }} isAnimationActive={false}/>
        <Line type="monotone" dataKey="high"     name="High"     stroke={SEV_CSS.high}     strokeWidth={2} dot={false} activeDot={{ r: 4 }} isAnimationActive={false}/>
        <Line type="monotone" dataKey="medium"   name="Medium"   stroke={SEV_CSS.medium}   strokeWidth={2} dot={false} activeDot={{ r: 4 }} isAnimationActive={false}/>
      </LineChart>
    </ResponsiveContainer>
  );
}

/* ── Diff view ───────────────────────────────────────────────── */

function DiffView({ current, previous }: { current: Vulnerability[]; previous: Vulnerability[] }) {
  const currentSet = new Set(current.map(v => v.cve_id + v.package_name));
  const previousSet = new Set(previous.map(v => v.cve_id + v.package_name));
  const added   = current.filter(v => !previousSet.has(v.cve_id + v.package_name));
  const removed = previous.filter(v => !currentSet.has(v.cve_id + v.package_name));
  const unchanged = current.length - added.length;

  if (added.length === 0 && removed.length === 0) return (
    <div style={{ padding: "12px 0", fontSize: 13, color: "var(--fg-dim)" }}>
      Aucun changement depuis le scan précédent
    </div>
  );

  return (
    <div style={{ background: "var(--bg-elev)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
      <div style={{ display: "grid", gridTemplateColumns: "28px 1fr", fontFamily: "var(--font-mono)", fontSize: 12 }}>
        <div style={{ gridColumn: "1/-1", display: "flex", borderBottom: "1px solid var(--border)", padding: "7px 12px", background: "var(--surface-2)", color: "var(--fg-faint)", fontSize: 11 }}>
          @@ {added.length > 0 ? `+${added.length} nouvelle${added.length > 1 ? "s" : ""}` : ""} {removed.length > 0 ? `−${removed.length} corrigée${removed.length > 1 ? "s" : ""}` : ""} · {unchanged} inchangées
        </div>
        {added.slice(0, 5).map(v => (
          <div key={"a" + v.id} style={{ display: "contents" }}>
            <div style={{ textAlign: "center", padding: "7px 0", background: "oklch(0.65 0.24 22 / 0.12)", color: "var(--sev-critical)", borderRight: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>+</div>
            <div style={{ padding: "7px 12px", background: "oklch(0.65 0.24 22 / 0.04)", color: "var(--fg)", borderBottom: "1px solid var(--border)" }}>
              <span style={{ color: "var(--sev-critical)" }}>{v.cve_id}</span>
              <span style={{ color: "var(--fg-dim)", marginLeft: 10 }}>{v.title?.slice(0, 60) || v.package_name}</span>
            </div>
          </div>
        ))}
        {removed.slice(0, 5).map(v => (
          <div key={"r" + v.id} style={{ display: "contents" }}>
            <div style={{ textAlign: "center", padding: "7px 0", background: "oklch(0.86 0.18 130 / 0.12)", color: "var(--accent)", borderRight: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>−</div>
            <div style={{ padding: "7px 12px", background: "oklch(0.86 0.18 130 / 0.04)", color: "var(--fg)", borderBottom: "1px solid var(--border)", textDecoration: "line-through", textDecorationColor: "var(--fg-faint)" }}>
              <span style={{ color: "var(--accent)" }}>{v.cve_id}</span>
              <span style={{ color: "var(--fg-dim)", marginLeft: 10 }}>corrigée</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Main page ───────────────────────────────────────────────── */

export default function ProjectDetailPage() {
  const { name: rawName } = useParams<{ name: string }>();
  const name = decodeURIComponent(rawName);

  const [project, setProject]     = useState<Project | null>(null);
  const [scans, setScans]         = useState<ScanSummary[]>([]);
  const [activeScanId, setActiveScanId] = useState<number | null>(null);
  const [vulns, setVulns]         = useState<Vulnerability[]>([]);
  const [prevVulns, setPrevVulns] = useState<Vulnerability[]>([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    Promise.all([projectsApi.list(), projectsApi.scans(name)])
      .then(async ([projects, s]) => {
        setProject(projects?.find(p => p.name === name) ?? null);
        const scanList = s ?? [];
        setScans(scanList);
        if (scanList.length > 0) {
          setActiveScanId(scanList[0].id);
          const [v, pv] = await Promise.all([
            projectsApi.scanVulnerabilities(scanList[0].id),
            scanList[1] ? projectsApi.scanVulnerabilities(scanList[1].id) : Promise.resolve([]),
          ]);
          setVulns(v ?? []);
          setPrevVulns(pv ?? []);
        }
      }).finally(() => setLoading(false));
  }, [name]);

  async function selectScan(scan: ScanSummary, idx: number) {
    setActiveScanId(scan.id);
    const [v, pv] = await Promise.all([
      projectsApi.scanVulnerabilities(scan.id),
      scans[idx + 1] ? projectsApi.scanVulnerabilities(scans[idx + 1].id) : Promise.resolve([]),
    ]);
    setVulns(v ?? []);
    setPrevVulns(pv ?? []);
  }

  const activeScan = scans.find(s => s.id === activeScanId);
  const p = project;

  const kpis = [
    { label: "Critical", value: p?.critical ?? 0, prev: activeScan?.critical ?? 0, color: "var(--sev-critical)" },
    { label: "High",     value: p?.high ?? 0,     prev: activeScan?.high ?? 0,     color: "var(--sev-high)" },
    { label: "Medium",   value: p?.medium ?? 0,   prev: activeScan?.medium ?? 0,   color: "var(--sev-medium)" },
    { label: "Low",      value: p?.low ?? 0,       prev: activeScan?.low ?? 0,      color: "var(--sev-low)" },
  ];

  const delta = (cur: number, prev: number) => cur - prev;

  if (loading) return (
    <div style={{ padding: "28px 32px" }}>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} style={{ height: 80, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, marginBottom: 16 }}/>
      ))}
    </div>
  );

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1480, margin: "0 auto", animation: "page-in 320ms cubic-bezier(0.2,0.7,0.2,1)" }}>

      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--fg-dim)", marginBottom: 20 }}>
        <Link href="/dashboard/projects" style={{ color: "var(--fg-muted)", textDecoration: "none" }}>Projects</Link>
        <ChevronRight size={12} style={{ color: "var(--fg-faint)" }}/>
        <span style={{ color: "var(--fg)" }}>{name}</span>
      </div>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28, gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 52, height: 52, borderRadius: 12, flexShrink: 0, background: "linear-gradient(135deg, oklch(0.65 0.20 280), oklch(0.65 0.20 240))", display: "grid", placeItems: "center", fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 20, color: "#08080b" }}>
            {name[0]?.toUpperCase()}
          </div>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.02em", margin: 0 }}>{name}</h1>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 5, fontSize: 12, color: "var(--fg-dim)", flexWrap: "wrap" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}><GitBranch size={11}/>main</span>
              <span style={{ color: "var(--fg-faint)" }}>·</span>
              <span>{p?.environment ?? "production"}</span>
              {p?.owner && <><span style={{ color: "var(--fg-faint)" }}>·</span><span>@{p.owner}</span></>}
              <span style={{ color: "var(--fg-faint)" }}>·</span>
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <Clock size={11}/>
                {p?.last_scan
                  ? <span title={format(new Date(p.last_scan), "d MMM yyyy HH:mm:ss")}>{timeAgo(p.last_scan)}</span>
                  : "Jamais scanné"}
              </span>
            </div>
            {/* Image name */}
            {scans[0]?.image_name && (
              <div style={{ marginTop: 6, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-faint)", display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ padding: "2px 7px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 6 }}>
                  {scans[0].image_name}
                </span>
                {scans[0].image_digest && (
                  <span style={{ color: "var(--fg-faint)", fontSize: 10 }}>
                    {scans[0].image_digest.slice(0, 19)}…
                  </span>
                )}
              </div>
            )}
            {/* Stack tags from latest scan */}
            {scans[0]?.langs && scans[0].langs.length > 0 && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                {scans[0].langs.map(l => <StackTag key={l} name={l}/>)}
              </div>
            )}
          </div>
        </div>
        <Link href={`/dashboard/projects/${encodeURIComponent(name)}/history`} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 8, fontSize: 13, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--fg-muted)", textDecoration: "none" }}>
          Historique complet →
        </Link>
      </div>

      {/* Bento grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 16 }}>

        {/* KPI cards */}
        {kpis.map((k, i) => {
          const d = delta(k.value, k.prev);
          return (
            <Spotlight key={i} style={{ gridColumn: "span 3" }}>
              <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.06em", color: k.color, fontFamily: "var(--font-mono)", marginBottom: 8 }}>{k.label}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: "-0.025em", lineHeight: 1, color: k.value > 0 ? k.color : "var(--fg)", fontFamily: "var(--font-mono)" }}>
                  {k.value}
                </div>
                {scans.length >= 2 && (
                  <span style={{
                    fontSize: 11, fontFamily: "var(--font-mono)", display: "inline-flex", alignItems: "center", gap: 2,
                    padding: "2px 6px", borderRadius: 4,
                    background: d > 0 ? "oklch(0.65 0.24 22 / 0.12)" : d < 0 ? "oklch(0.86 0.18 130 / 0.12)" : "var(--surface-3)",
                    color: d > 0 ? "var(--sev-critical)" : d < 0 ? "var(--accent)" : "var(--fg-muted)",
                  }}>
                    {d > 0 ? <ArrowUp size={9}/> : d < 0 ? <ArrowDown size={9}/> : <Minus size={9}/>}
                    {Math.abs(d)}
                  </span>
                )}
              </div>
              <div style={{ color: "var(--fg-dim)", fontSize: 11, marginTop: 8 }}>depuis dernier scan</div>
            </Spotlight>
          );
        })}

        {/* Evolution chart */}
        <Spotlight style={{ gridColumn: "span 8" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 13, color: "var(--fg-muted)", fontWeight: 500 }}>Évolution des CVEs · {name}</div>
              <div style={{ fontSize: 11.5, color: "var(--fg-dim)", marginTop: 2 }}>Par scan · {scans.length} scan{scans.length !== 1 ? "s" : ""}</div>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              {(["critical","high","medium"] as const).map(k => (
                <div key={k} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--fg-muted)" }}>
                  <span style={{ width: 16, height: 2, borderRadius: 999, background: SEV_CSS[k], display: "inline-block" }}/>
                  <span style={{ fontFamily: "var(--font-mono)", textTransform: "capitalize" }}>{k}</span>
                </div>
              ))}
            </div>
          </div>
          <ProjectEvoChart scans={scans} height={200}/>
        </Spotlight>

        {/* Config / meta */}
        <Spotlight style={{ gridColumn: "span 4" }}>
          <div style={{ fontSize: 13, color: "var(--fg-muted)", fontWeight: 500, marginBottom: 16 }}>Configuration</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 12.5 }}>
            {[
              { label: "Environment", value: p?.environment ?? "production" },
              { label: "Owner",       value: p?.owner || "—" },
              { label: "Image",       value: scans[0]?.image_name || "—" },
              { label: "Total scans", value: String(scans.length) },
              { label: "Dernier scan", value: p?.last_scan ? timeAgo(p.last_scan) : "—" },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <span style={{ color: "var(--fg-dim)" }}>{label}</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, color: "var(--fg)" }}>{value}</span>
              </div>
            ))}
          </div>
          <div style={{ height: 1, background: "var(--border)", margin: "16px 0" }}/>
          <Link href={`/dashboard/projects/${encodeURIComponent(name)}/history`}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px", borderRadius: 8, border: "1px solid var(--border)", fontSize: 12.5, color: "var(--fg-muted)", textDecoration: "none", transition: "all 140ms ease" }}>
            Voir l&apos;historique complet
          </Link>
        </Spotlight>

        {/* Scan timeline */}
        <Spotlight style={{ gridColumn: "span 12" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: "var(--fg-muted)" }}>Timeline des scans</span>
            <span style={{ fontSize: 11.5, color: "var(--fg-dim)" }}>{scans.length} scans · cliquez pour voir le diff</span>
          </div>

          {scans.length === 0 ? (
            <div style={{ padding: "24px 0", textAlign: "center", color: "var(--fg-dim)", fontSize: 13 }}>Aucun scan pour ce projet</div>
          ) : (
            <>
              {/* Timeline dots */}
              <div style={{ position: "relative", paddingBottom: 20, overflowX: "auto" }}>
                <div style={{ position: "absolute", left: 0, right: 0, top: 18, height: 1, background: "var(--border)" }}/>
                <div style={{ display: "flex", minWidth: Math.max(600, scans.length * 60) }}>
                  {[...scans].reverse().map((s, i) => {
                    const isActive = s.id === activeScanId;
                    const hasIssues = s.critical > 0;
                    return (
                      <div key={s.id} onClick={() => selectScan(s, scans.length - 1 - i)}
                        style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, cursor: "pointer", position: "relative", zIndex: 1 }}>
                        <div style={{
                          width: 12, height: 12, borderRadius: "50%", transition: "all 200ms ease",
                          background: isActive ? "var(--accent)" : hasIssues ? "var(--sev-critical)" : "var(--fg-faint)",
                          boxShadow: isActive ? "0 0 0 4px oklch(0.86 0.18 130 / 0.18), 0 0 12px var(--accent-glow)" : "none",
                        }}/>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: isActive ? "var(--fg)" : "var(--fg-dim)" }}>
                            #{s.id}
                          </span>
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--fg-faint)" }}>
                            {format(new Date(s.scanned_at), "MM/dd")}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Active scan detail + diff */}
              {activeScan && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 8 }}>
                  {/* Scan counts */}
                  <div>
                    <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--fg-faint)", fontFamily: "var(--font-mono)", marginBottom: 12 }}>
                      Scan #{activeScan.id} · {format(new Date(activeScan.scanned_at), "MMM d, yyyy HH:mm")}
                    </div>
                    <div style={{ display: "flex", gap: 20 }}>
                      {[
                        { l: "Critical", v: activeScan.critical, c: "var(--sev-critical)" },
                        { l: "High",     v: activeScan.high,     c: "var(--sev-high)" },
                        { l: "Medium",   v: activeScan.medium,   c: "var(--sev-medium)" },
                        { l: "Low",      v: activeScan.low,      c: "var(--sev-low)" },
                      ].map(({ l, v, c }) => (
                        <div key={l} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", color: c, fontFamily: "var(--font-mono)" }}>{l}</span>
                          <span style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em", color: v > 0 ? c : "var(--fg)", fontFamily: "var(--font-mono)" }}>{v}</span>
                        </div>
                      ))}
                    </div>
                    {activeScan.pipeline_id && (
                      <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "var(--fg-dim)" }}>
                        <span style={{ fontFamily: "var(--font-mono)", padding: "2px 8px", background: "var(--surface-3)", borderRadius: 6 }}>#{activeScan.pipeline_id}</span>
                        {activeScan.pipeline_url && (
                          <a href={activeScan.pipeline_url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--fg-faint)", display: "flex" }}>
                            <ExternalLink size={12}/>
                          </a>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Diff */}
                  <div>
                    <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--fg-faint)", fontFamily: "var(--font-mono)", marginBottom: 12 }}>
                      Diff vs scan précédent
                    </div>
                    <DiffView current={vulns} previous={prevVulns}/>
                  </div>
                </div>
              )}
            </>
          )}
        </Spotlight>

        {/* Severity breakdown */}
        <Spotlight style={{ gridColumn: "span 4" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <span style={{ fontSize: 13, color: "var(--fg-muted)", fontWeight: 500 }}>Répartition par sévérité</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-dim)" }}>{vulns.length} total</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {([
              { label: "Critical", v: vulns.filter(x => x.severity === "CRITICAL").length, color: "oklch(0.65 0.24 22)" },
              { label: "High",     v: vulns.filter(x => x.severity === "HIGH").length,     color: "oklch(0.72 0.18 50)" },
              { label: "Medium",   v: vulns.filter(x => x.severity === "MEDIUM").length,   color: "oklch(0.82 0.16 90)" },
              { label: "Low",      v: vulns.filter(x => x.severity === "LOW").length,       color: "oklch(0.70 0.14 245)" },
            ]).map(s => {
              const pct = vulns.length ? (s.v / vulns.length) * 100 : 0;
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
              <div style={{ color: "var(--fg-dim)", fontSize: 11 }}>CVSS moyen</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 18, fontWeight: 600, marginTop: 4 }}>
                {(() => {
                  const withScore = vulns.filter(v => v.cvss_score != null);
                  if (!withScore.length) return <span style={{ color: "var(--fg-faint)" }}>—</span>;
                  const avg = withScore.reduce((s, v) => s + v.cvss_score!, 0) / withScore.length;
                  const color = avg >= 9 ? "var(--sev-critical)" : avg >= 7 ? "var(--sev-high)" : avg >= 4 ? "var(--sev-medium)" : "var(--sev-low)";
                  return <span style={{ color }}>{avg.toFixed(1)}</span>;
                })()}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ color: "var(--fg-dim)", fontSize: 11 }}>Avec fix dispo</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 18, fontWeight: 600, marginTop: 4, color: "var(--accent)" }}>
                {vulns.filter(v => v.fixed_version).length}
                <span style={{ fontSize: 11, color: "var(--fg-faint)", fontWeight: 400 }}> / {vulns.length}</span>
              </div>
            </div>
          </div>
        </Spotlight>

        {/* Top CVEs by CVSS */}
        <Spotlight style={{ gridColumn: "span 8" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <span style={{ fontSize: 13, color: "var(--fg-muted)", fontWeight: 500 }}>Top vulnérabilités · CVSS</span>
            <span style={{ fontSize: 11, color: "var(--fg-dim)", fontFamily: "var(--font-mono)" }}>scan #{activeScan?.id ?? "—"}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {vulns.length === 0 ? (
              <div style={{ padding: "24px 0", textAlign: "center", color: "var(--fg-dim)", fontSize: 13 }}>Aucune vulnérabilité</div>
            ) : [...vulns]
                .sort((a, b) => {
                  if (b.cvss_score != null && a.cvss_score != null) return b.cvss_score - a.cvss_score;
                  const ord: Record<string,number> = { CRITICAL:4, HIGH:3, MEDIUM:2, LOW:1 };
                  return (ord[b.severity]??0) - (ord[a.severity]??0);
                })
                .slice(0, 8)
                .map(v => (
                  <div key={v.id}
                    style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 8px", borderRadius: 8, transition: "background 140ms ease", cursor: "default" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--surface-2)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    {/* CVSS gauge */}
                    {v.cvss_score != null ? (
                      <div style={{
                        width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
                        background: `conic-gradient(${v.cvss_score >= 9 ? "var(--sev-critical)" : v.cvss_score >= 7 ? "var(--sev-high)" : v.cvss_score >= 4 ? "var(--sev-medium)" : "var(--sev-low)"} ${(v.cvss_score/10)*100}%, var(--surface-3) 0)`,
                        display: "grid", placeItems: "center", position: "relative",
                      }}>
                        <div style={{ position: "absolute", inset: 5, borderRadius: "50%", background: "var(--surface)" }}/>
                        <span style={{ position: "relative", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, color: v.cvss_score >= 9 ? "var(--sev-critical)" : v.cvss_score >= 7 ? "var(--sev-high)" : v.cvss_score >= 4 ? "var(--sev-medium)" : "var(--sev-low)" }}>
                          {v.cvss_score.toFixed(1)}
                        </span>
                      </div>
                    ) : (
                      <SevChip level={v.severity}/>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, color: "var(--fg)", fontWeight: 600 }}>{v.cve_id}</span>
                        <SevChip level={v.severity}/>
                        {v.fixed_version && (
                          <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, background: "oklch(0.86 0.18 130 / 0.10)", color: "var(--accent)", fontFamily: "var(--font-mono)" }}>fix dispo</span>
                        )}
                      </div>
                      <div style={{ fontSize: 11.5, color: "var(--fg-dim)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 2 }}>
                        {v.title || v.package_name}
                      </div>
                    </div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-faint)", flexShrink: 0 }}>
                      {v.package_name}@{v.installed_version}
                    </div>
                  </div>
                ))
            }
          </div>
        </Spotlight>

        {/* Vulnerabilities */}
        <div style={{ gridColumn: "span 12", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: "var(--fg-muted)" }}>Vulnérabilités ouvertes · scan #{activeScan?.id ?? "—"}</span>
            <Link href="/dashboard/vulnerabilities" style={{ fontSize: 12, color: "var(--fg-dim)", textDecoration: "none" }}>
              Voir tout →
            </Link>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--surface-2)", borderBottom: "1px solid var(--border)" }}>
                  {["Severity", "CVE", "CVSS", "Package", "Version", "Fix"].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "10px 14px", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--fg-dim)", fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vulns.length === 0 ? (
                  <tr><td colSpan={6} style={{ padding: "40px 0", textAlign: "center", color: "var(--fg-dim)", fontSize: 13 }}>Aucune vulnérabilité</td></tr>
                ) : vulns.slice(0, 15).map(v => (
                  <tr key={v.id}
                    style={{ borderBottom: "1px solid var(--border)", transition: "background 140ms ease" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--surface-2)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <td style={{ padding: "10px 14px" }}><SevChip level={v.severity}/></td>
                    <td style={{ padding: "10px 14px", fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600, color: "var(--fg)" }}>{v.cve_id}</td>
                    <td style={{ padding: "10px 14px" }}>
                      {v.cvss_score != null
                        ? <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: v.cvss_score >= 9 ? "var(--sev-critical)" : v.cvss_score >= 7 ? "var(--sev-high)" : v.cvss_score >= 4 ? "var(--sev-medium)" : "var(--sev-low)" }}>{v.cvss_score.toFixed(1)}</span>
                        : <span style={{ color: "var(--fg-faint)", fontSize: 11 }}>—</span>}
                    </td>
                    <td style={{ padding: "10px 14px", fontSize: 13 }}>{v.package_name}</td>
                    <td style={{ padding: "10px 14px", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-dim)" }}>{v.installed_version}</td>
                    <td style={{ padding: "10px 14px", fontFamily: "var(--font-mono)", fontSize: 11 }}>
                      {v.fixed_version
                        ? <span style={{ color: "var(--accent)" }}>→ {v.fixed_version}</span>
                        : <span style={{ color: "var(--fg-faint)" }}>—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {vulns.length > 15 && (
            <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", textAlign: "center" }}>
              <Link href="/dashboard/vulnerabilities" style={{ fontSize: 12, color: "var(--fg-dim)", textDecoration: "none" }}>
                +{vulns.length - 15} autres vulnérabilités →
              </Link>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
