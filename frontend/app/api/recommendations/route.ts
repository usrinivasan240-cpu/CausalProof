import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getReport } from "@/lib/storage";
import { generateRecommendations } from "@/lib/engine/recommendations";
import { extractFacts } from "@/lib/engine/observedPathway";

export async function POST(request: Request) {
  const auth = requireAuth(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 });

  try {
    const body = await request.json();
    const { investigationId } = body as { investigationId: string };
    if (!investigationId) {
      return NextResponse.json({ error: "investigationId is required." }, { status: 400 });
    }

    const report = getReport(investigationId);
    if (!report) {
      return NextResponse.json({ error: "No analysis report found." }, { status: 404 });
    }

    const facts = extractFacts(report.evidence);
    const recommendations = generateRecommendations({ facts });

    return NextResponse.json({ recommendations });
  } catch {
    return NextResponse.json({ error: "Failed to generate recommendations." }, { status: 500 });
  }
}
