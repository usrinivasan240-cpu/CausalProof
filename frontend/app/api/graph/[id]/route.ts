import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getReport, getEvidence, getIntended, getUploads } from "@/lib/storage";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = requireAuth(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 });

  const { id } = await params;

  const report = getReport(id);
  if (!report) {
    return NextResponse.json({ error: "No report found." }, { status: 404 });
  }

  return NextResponse.json({
    intended: report.intendedPathway,
    observed: report.observedPathway,
    edges: report.pathwayEdges,
    divergences: report.divergences,
    executiveSummary: report.executiveSummary,
    hypotheses: report.hypotheses,
    evidence: report.evidence,
    contradictingEvidence: report.contradictingEvidence,
    confidence: report.confidence,
    counterfactuals: report.counterfactuals,
    recommendations: report.recommendations,
    missingInformation: report.missingInformation,
    limitations: report.limitations,
    dataSources: report.dataSources,
    generatedAt: report.generatedAt,
    aiSource: report.aiSource,
  });
}
