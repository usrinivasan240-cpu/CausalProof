import { NextResponse } from "next/server";
import { getInvestigation, deleteInvestigation } from "@/lib/storage";
import { requireAuth } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = requireAuth(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 });

  const { id } = await params;
  const inv = getInvestigation(id);
  if (!inv) return NextResponse.json({ error: "Investigation not found." }, { status: 404 });
  return NextResponse.json({ investigation: inv });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = requireAuth(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 });

  const { id } = await params;
  const ok = deleteInvestigation(id);
  if (!ok) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ deleted: true });
}
