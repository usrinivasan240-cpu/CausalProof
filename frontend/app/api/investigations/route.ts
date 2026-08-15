import { NextResponse } from "next/server";
import { listInvestigations, getInvestigation } from "@/lib/storage";
import { requireAuth } from "@/lib/auth";

export async function GET(request: Request) {
  const auth = requireAuth(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 });

  const items = listInvestigations().map((inv) => ({
    id: inv.id,
    name: inv.name,
    domain: inv.domain,
    status: inv.status,
    createdAt: inv.createdAt,
    lastAnalysisAt: inv.lastAnalysisAt,
    isDemo: inv.isDemo,
  }));
  return NextResponse.json({ investigations: items });
}

export async function POST(request: Request) {
  const auth = requireAuth(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 });

  try {
    const body = await request.json();
    if (!body.name || !body.domain || !body.problem) {
      return NextResponse.json({ error: "name, domain, and problem are required." }, { status: 400 });
    }

    const { saveInvestigation } = await import("@/lib/storage");
    const id = `inv_${Date.now().toString(36)}`;
    const investigation = {
      id,
      name: String(body.name).slice(0, 200),
      domain: String(body.domain).slice(0, 100),
      problem: String(body.problem).slice(0, 1000),
      intervention: String(body.intervention ?? "").slice(0, 1000),
      expectedOutcome: String(body.expectedOutcome ?? "").slice(0, 1000),
      targetMetric: String(body.targetMetric ?? "").slice(0, 200),
      targetValue: Number(body.targetValue) || 0,
      periodStart: String(body.periodStart ?? ""),
      periodEnd: String(body.periodEnd ?? ""),
      status: "DRAFT" as const,
      createdAt: new Date().toISOString(),
    };
    saveInvestigation(investigation);
    return NextResponse.json({ investigation }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}
