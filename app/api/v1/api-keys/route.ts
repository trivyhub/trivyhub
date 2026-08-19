import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate, requireRole } from "@/lib/api-middleware";
import { randomBytes, createHash } from "crypto";

function generateKey() {
  const bytes = randomBytes(32);
  const full = "tvd_" + bytes.toString("hex");
  const prefix = full.slice(0, 10);
  const hash = createHash("sha256").update(full).digest("hex");
  return { full, prefix, hash };
}

function serializeKey(k: {
  id: number;
  organizationId: number;
  name: string;
  keyPrefix: string;
  createdAt: Date;
  lastUsedAt: Date | null;
  revoked: boolean;
}) {
  return {
    id: k.id,
    organization_id: k.organizationId,
    name: k.name,
    key_prefix: k.keyPrefix,
    created_at: k.createdAt,
    last_used_at: k.lastUsedAt,
    revoked: k.revoked,
  };
}

export async function GET(req: NextRequest) {
  const claims = await authenticate(req);
  if (claims instanceof NextResponse) return claims;

  const denied = requireRole(claims, "owner", "admin");
  if (denied) return denied;

  const keys = await prisma.apiKey.findMany({
    where: { organizationId: claims.organizationId },
    orderBy: { createdAt: "desc" },
  });

  // Snake_case per the APIKey contract (lib/types.ts) — raw Prisma camelCase
  // leaves created_at undefined and crashes the api-keys page's date format.
  return NextResponse.json(keys.map(serializeKey));
}

export async function POST(req: NextRequest) {
  const claims = await authenticate(req);
  if (claims instanceof NextResponse) return claims;

  const denied = requireRole(claims, "owner", "admin");
  if (denied) return denied;

  const body = await req.json();
  const { name } = body;
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

  const { full, prefix, hash } = generateKey();
  const key = await prisma.apiKey.create({
    data: { organizationId: claims.organizationId, name, keyHash: hash, keyPrefix: prefix },
  });

  return NextResponse.json({ ...serializeKey(key), key: full }, { status: 201 });
}
