import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getReport } from "@/lib/storage";
import { runCounterfactuals, CustomCounterfactual } from "@/lib/engine/counterfactual";
import { extractFacts } from "@/lib/engine/observedPathway";

export async function POST(request: Request) {
  const auth = requireAuth(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 });

  try {
    const body = await request.json();
    const { investigationId, variable, value } = body as {
      investigationId: string;
      variable?: string;
      value?: number;
    };

    if (!investigationId) {
      return NextResponse.json({ error: "investigationId is required." }, { status: 400 });
    }

    const report = getReport(investigationId);
    if (!report) {
      return NextResponse.json({ error: "No analysis report found. Run /api/analyze first." }, { status: 404 });
    }

    const facts = extractFacts(report.evidence);
    const custom: CustomCounterfactual | undefined =
      variable ? { variable, value } : undefined;
    const counterfactuals = runCounterfactuals({ facts }, custom);

    return NextResponse.json({ counterfactuals });
  } catch {
    return NextResponse.json({ error: "Counterfactual simulation failed." }, { status: 500 });
  }
}
