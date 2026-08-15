import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getReport } from "@/lib/storage";

export async function GET(request: Request) {
  const auth = requireAuth(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 });

  const url = new URL(request.url);
  const investigationId = url.searchParams.get("investigationId");
  if (!investigationId) {
    return NextResponse.json({ error: "investigationId query param required." }, { status: 400 });
  }

  const report = getReport(investigationId);
  if (!report) {
    return NextResponse.json({ error: "No analysis report found. Run /api/analyze first." }, { status: 404 });
  }

  return NextResponse.json({
    nodes: report.observedPathway,
    edges: report.pathwayEdges,
    divergences: report.divergences,
  });
}
