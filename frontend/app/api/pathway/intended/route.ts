import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getInvestigation, saveIntended, getIntended } from "@/lib/storage";
import { sanitizeText } from "@/lib/engine/validation";
import type { PathwayNode } from "@/lib/engine/types";

export async function POST(request: Request) {
  const auth = requireAuth(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 });

  try {
    const body = await request.json();
    const { investigationId, nodes } = body as {
      investigationId: string;
      nodes: PathwayNode[];
    };

    if (!investigationId || !Array.isArray(nodes)) {
      return NextResponse.json({ error: "investigationId and nodes[] are required." }, { status: 400 });
    }

    const inv = getInvestigation(investigationId);
    if (!inv) return NextResponse.json({ error: "Investigation not found." }, { status: 404 });

    const sanitized: PathwayNode[] = nodes.map((n, i) => ({
      id: n.id || `n_${i}`,
      label: sanitizeText(n.label, 200),
      kind: n.kind || "event",
      description: sanitizeText(n.description ?? "", 1000),
      expectedMetric: sanitizeText(n.expectedMetric ?? "", 200),
      expectedValue: sanitizeText(n.expectedValue ?? "", 100),
      status: "EXPECTED" as const,
      evidence: [],
    }));

    saveIntended(investigationId, sanitized);
    return NextResponse.json({ nodes: sanitized });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}

export async function GET(request: Request) {
  const auth = requireAuth(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 });

  const url = new URL(request.url);
  const investigationId = url.searchParams.get("investigationId");
  if (!investigationId) {
    return NextResponse.json({ error: "investigationId query param required." }, { status: 400 });
  }
  const nodes = getIntended(investigationId);
  return NextResponse.json({ nodes });
}
