import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate, requireRole } from "@/lib/api-middleware";
import { hashPassword } from "@/lib/server-auth";

export async function GET(req: NextRequest) {
  const claims = await authenticate(req);
  if (claims instanceof NextResponse) return claims;

  const users = await prisma.user.findMany({
    where: { organizationId: claims.organizationId },
    orderBy: { createdAt: "asc" },
  });

  // Snake_case per the User contract (lib/types.ts) — the members page shows
  // "—" for every join date because created_at is undefined on raw Prisma rows.
  return NextResponse.json(
    users.map((u) => ({
      id: u.id,
      organization_id: u.organizationId,
      email: u.email,
      role: u.role,
      created_at: u.createdAt,
    }))
  );
}

export async function POST(req: NextRequest) {
  const claims = await authenticate(req);
  if (claims instanceof NextResponse) return claims;

  const denied = requireRole(claims, "owner", "admin");
  if (denied) return denied;

  const body = await req.json();
  const { email, role } = body;

  if (!email || !["admin", "member", "viewer"].includes(role)) {
    return NextResponse.json({ error: "email and valid role required" }, { status: 400 });
  }

  const tempHash = await hashPassword("ChangeMe123!");

  try {
    const user = await prisma.user.create({
      data: { organizationId: claims.organizationId, email, passwordHash: tempHash, role },
    });
    const { passwordHash: _, ...safeUser } = user;
    return NextResponse.json(
      { user: safeUser, temp_password: "ChangeMe123!", message: "User invited. Share the temp_password and ask them to change it on first login." },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: "email already in use" }, { status: 409 });
  }
}
