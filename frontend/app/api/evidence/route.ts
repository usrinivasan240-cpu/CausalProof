import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getEvidence } from "@/lib/storage";

export async function GET(request: Request) {
  const auth = requireAuth(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 });

  const url = new URL(request.url);
  const investigationId = url.searchParams.get("investigationId");
  if (!investigationId) {
    return NextResponse.json({ error: "investigationId query param required." }, { status: 400 });
  }

  const evidence = getEvidence(investigationId);
  return NextResponse.json({ evidence, count: evidence.length });
}
