import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getInvestigation, getIntended, getEvidence, saveReport, saveInvestigation } from "@/lib/storage";
import { extractFacts } from "@/lib/engine/observedPathway";
import { runAnalysis, PipelineInput } from "@/lib/engine/pipeline";
import type { DataSourceSummary } from "@/lib/engine/types";
import { getUploads } from "@/lib/storage";

export async function POST(request: Request) {
  const auth = requireAuth(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 });

  try {
    const body = await request.json();
    const { investigationId } = body as { investigationId: string };
    if (!investigationId) {
      return NextResponse.json({ error: "investigationId is required." }, { status: 400 });
    }

    const inv = getInvestigation(investigationId);
    if (!inv) return NextResponse.json({ error: "Investigation not found." }, { status: 404 });

    const intendedNodes = getIntended(investigationId);
    if (intendedNodes.length === 0) {
      return NextResponse.json({ error: "Define the intended pathway before running analysis." }, { status: 400 });
    }

    const evidence = getEvidence(investigationId);
    if (evidence.length === 0) {
      return NextResponse.json({ error: "Upload data files before running analysis." }, { status: 400 });
    }

    const uploads = getUploads(investigationId);
    const dataSources: DataSourceSummary[] = uploads.map((u) => u.summary);

    const input: PipelineInput = {
      investigation: inv,
      intendedNodes,
      evidence,
      dataSources,
      aiSource: "deterministic",
      aiNote: "Analysis performed by the deterministic rule-based engine.",
    };

    const report = runAnalysis(input);
    saveReport(investigationId, report);
    inv.status = "ANALYZED";
    inv.lastAnalysisAt = report.generatedAt;
    saveInvestigation(inv);

    return NextResponse.json({ report });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Analysis failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
