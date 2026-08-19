import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/api-middleware";

const SEVERITY_ORDER: Record<string, number> = { CRITICAL: 1, HIGH: 2, MEDIUM: 3, LOW: 4 };

export async function GET(req: NextRequest) {
  const claims = await authenticate(req);
  if (claims instanceof NextResponse) return claims;

  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
  const limit = Math.min(500, Math.max(1, parseInt(url.searchParams.get("limit") ?? "100", 10)));
  const severity = url.searchParams.get("severity") ?? "";
  const projectName = url.searchParams.get("project") ?? "";
  const offset = (page - 1) * limit;

  // Get latest scan id per project in this org
  const projects = await prisma.project.findMany({
    where: {
      organizationId: claims.organizationId,
      ...(projectName ? { name: projectName } : {}),
    },
    select: {
      id: true,
      scans: {
        orderBy: { scannedAt: "desc" },
        take: 1,
        select: { id: true },
      },
    },
  });

  const latestScanIds = projects
    .map((p) => p.scans[0]?.id)
    .filter((id): id is number => id !== undefined);

  if (latestScanIds.length === 0) {
    return NextResponse.json({ data: [], total: 0, page, limit });
  }

  const where = {
    scanId: { in: latestScanIds },
    ...(severity ? { severity } : {}),
  };

  const [total, vulns] = await Promise.all([
    prisma.vulnerability.count({ where }),
    prisma.vulnerability.findMany({
      where,
      skip: offset,
      take: limit,
      orderBy: [{ severity: "asc" }, { cveId: "asc" }],
    }),
  ]);

  const sorted = vulns.sort(
    (a, b) => (SEVERITY_ORDER[a.severity] ?? 5) - (SEVERITY_ORDER[b.severity] ?? 5)
  );

  // Serialize to the snake_case Vulnerability contract (lib/types.ts), like
  // the projects route does — raw Prisma camelCase crashes the dashboard's
  // date formatting (RangeError: Invalid time value on undefined fields).
  const data = sorted.map((v) => ({
    id: v.id,
    scan_id: v.scanId,
    cve_id: v.cveId,
    severity: v.severity,
    package_name: v.packageName,
    installed_version: v.installedVersion,
    fixed_version: v.fixedVersion,
    title: v.title,
    description: v.description,
    primary_url: v.primaryUrl,
    is_fixed: v.isFixed,
    first_seen_at: v.firstSeenAt,
    cvss_score: v.cvssScore,
  }));

  return NextResponse.json({ data, total, page, limit });
}
