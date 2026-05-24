"use client";
import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { authApi } from "@/lib/api";
import { saveAuth } from "@/lib/auth";

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--bg)",
  border: "1px solid var(--border-strong)",
  borderRadius: 8,
  padding: "10px 12px",
  fontSize: 13,
  color: "var(--fg)",
  outline: "none",
  transition: "border-color 160ms ease, box-shadow 160ms ease",
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [expired, setExpired] = useState(false);

  useEffect(() => { if (searchParams.get("expired")) setExpired(true); }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await authApi.login(email, password);
      saveAuth(res.token, res.user);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      background: "var(--surface)",
      border: "1px solid var(--border-strong)",
      borderRadius: 14,
      padding: 24,
    }}>
      {expired && (
        <div style={{
          background: "oklch(0.82 0.16 90 / 0.08)",
          border: "1px solid oklch(0.82 0.16 90 / 0.20)",
          color: "var(--sev-medium)",
          borderRadius: 8,
          padding: "10px 14px",
          fontSize: 13,
          marginBottom: 16,
        }}>
          Your session has expired. Please sign in again.
        </div>
      )}
      {error && (
        <div style={{
          background: "oklch(0.65 0.24 22 / 0.08)",
          border: "1px solid oklch(0.65 0.24 22 / 0.20)",
          color: "var(--sev-critical)",
          borderRadius: 8,
          padding: "10px 14px",
          fontSize: 13,
          marginBottom: 16,
        }}>
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: 12, fontWeight: 500, color: "var(--fg-muted)" }}>Email</label>
          <input
            type="email" value={email} onChange={e => setEmail(e.target.value)} required
            style={inputStyle}
            placeholder="you@company.com"
            onFocus={e => {
              e.target.style.borderColor = "var(--accent-dim)";
              e.target.style.boxShadow = "0 0 0 3px oklch(0.86 0.18 130 / 0.12)";
            }}
            onBlur={e => {
              e.target.style.borderColor = "var(--border-strong)";
              e.target.style.boxShadow = "none";
            }}
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: 12, fontWeight: 500, color: "var(--fg-muted)" }}>Password</label>
          <input
            type="password" value={password} onChange={e => setPassword(e.target.value)} required
            style={inputStyle}
            placeholder="••••••••"
            onFocus={e => {
              e.target.style.borderColor = "var(--accent-dim)";
              e.target.style.boxShadow = "0 0 0 3px oklch(0.86 0.18 130 / 0.12)";
            }}
            onBlur={e => {
              e.target.style.borderColor = "var(--border-strong)";
              e.target.style.boxShadow = "none";
            }}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            background: "linear-gradient(180deg, oklch(0.92 0.16 130), oklch(0.78 0.18 130))",
            color: "#08080b",
            border: "none",
            borderRadius: 8,
            padding: "10px",
            fontSize: 13,
            fontWeight: 500,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.6 : 1,
            transition: "filter 160ms ease, transform 160ms ease",
            boxShadow: "0 0 0 1px oklch(0.78 0.18 130), 0 8px 24px -8px var(--accent-glow)",
            marginTop: 4,
          }}
          onMouseEnter={e => {
            if (!loading) {
              (e.currentTarget as HTMLElement).style.filter = "brightness(1.05)";
              (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
            }
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.filter = "none";
            (e.currentTarget as HTMLElement).style.transform = "none";
          }}
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "0 16px",
    }}>
      <div style={{ width: "100%", maxWidth: 360 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 48, height: 48,
            borderRadius: 14,
            background: "linear-gradient(135deg, var(--accent), var(--violet))",
            display: "grid", placeItems: "center",
            color: "#08080b",
            fontWeight: 700,
            fontFamily: "var(--font-mono)",
            fontSize: 20,
            boxShadow: "0 0 32px var(--accent-glow)",
            position: "relative",
            overflow: "hidden",
            margin: "0 auto 16px",
          }}>
            T
            <span style={{
              position: "absolute", inset: 0,
              background: "conic-gradient(from 0deg, transparent, rgba(255,255,255,0.18), transparent 30%)",
              animation: "brand-spin 4s linear infinite",
            }}/>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--fg)", margin: 0 }}>
            Trivihub
          </h1>
          <p style={{ color: "var(--fg-dim)", fontSize: 13.5, marginTop: 6 }}>
            Sign in to your organization
          </p>
        </div>
        <Suspense fallback={
          <div style={{
            background: "var(--surface)",
            border: "1px solid var(--border-strong)",
            borderRadius: 14,
            padding: 24,
            height: 200,
          }}/>
        }>
          <LoginForm />
        </Suspense>
        <p style={{ textAlign: "center", fontSize: 13, color: "var(--fg-dim)", marginTop: 16 }}>
          No account?{" "}
          <Link href="/register" style={{ color: "var(--accent)", fontWeight: 500 }}>
            Create organization
          </Link>
        </p>
      </div>
    </div>
  );
}
