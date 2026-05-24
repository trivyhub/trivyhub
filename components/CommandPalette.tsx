"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, FolderGit2, ShieldAlert, X } from "lucide-react";
import { projectsApi, vulnApi } from "@/lib/api";
import type { Project, Vulnerability } from "@/lib/types";

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [vulns, setVulns] = useState<Vulnerability[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(o => !o);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) { setQuery(""); return; }
    setLoading(true);
    Promise.all([projectsApi.list(), vulnApi.list(1, 200)])
      .then(([p, v]) => { setProjects(p ?? []); setVulns(v?.data ?? []); })
      .finally(() => setLoading(false));
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = query.length < 1 ? { projects: projects.slice(0, 5), vulns: [] } : {
    projects: projects.filter(p => p.name.toLowerCase().includes(query.toLowerCase())).slice(0, 5),
    vulns: vulns.filter(v =>
      v.cve_id.toLowerCase().includes(query.toLowerCase()) ||
      v.package_name.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 5),
  };

  function go(href: string) { router.push(href); setOpen(false); }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={() => setOpen(false)}
    >
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        className="w-full max-w-lg rounded-xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Input */}
        <div style={{ borderColor: "var(--border)" }} className="flex items-center gap-3 px-4 py-3 border-b">
          <Search className="w-4 h-4 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search projects, CVEs, packages…"
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: "var(--text)" }}
          />
          <div style={{ color: "var(--text-muted)", background: "var(--bg-hover)", border: "1px solid var(--border)" }}
            className="text-xs px-1.5 py-0.5 rounded font-mono"
          >ESC</div>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto py-2">
          {loading && (
            <div className="px-4 py-6 text-center text-sm" style={{ color: "var(--text-muted)" }}>Loading…</div>
          )}

          {!loading && filtered.projects.length > 0 && (
            <div>
              <p className="px-4 py-1.5 text-xs font-medium uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Projects</p>
              {filtered.projects.map(p => (
                <button key={p.id} onClick={() => go(`/dashboard/projects/${encodeURIComponent(p.name)}`)}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-left hover:bg-[var(--bg-hover)] transition-colors"
                >
                  <FolderGit2 className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                  <div>
                    <p style={{ color: "var(--text)" }}>{p.name}</p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>{p.environment} · {p.critical}C {p.high}H</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {!loading && filtered.vulns.length > 0 && (
            <div>
              <p className="px-4 py-1.5 text-xs font-medium uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Vulnerabilities</p>
              {filtered.vulns.map(v => (
                <button key={v.id} onClick={() => go(`/dashboard/vulnerabilities`)}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-left hover:bg-[var(--bg-hover)] transition-colors"
                >
                  <ShieldAlert className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <div>
                    <p className="font-mono" style={{ color: "var(--text)" }}>{v.cve_id}</p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>{v.package_name} · {v.severity}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {!loading && filtered.projects.length === 0 && filtered.vulns.length === 0 && query.length > 0 && (
            <div className="px-4 py-6 text-center text-sm" style={{ color: "var(--text-muted)" }}>
              No results for &quot;{query}&quot;
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ borderColor: "var(--border)", background: "var(--bg-hover)", color: "var(--text-muted)" }}
          className="flex items-center gap-4 px-4 py-2 border-t text-xs"
        >
          <span><kbd className="font-mono">↑↓</kbd> navigate</span>
          <span><kbd className="font-mono">↵</kbd> open</span>
          <span><kbd className="font-mono">esc</kbd> close</span>
          <span className="ml-auto"><kbd className="font-mono">⌘K</kbd> toggle</span>
        </div>
      </div>
    </div>
  );
}
