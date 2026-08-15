// Causal Divergence Detection.
//
// Compares the intended and observed pathways and produces structured
// divergence records. Each divergence lists the evidence that supports it
// and a confidence score.

import { Divergence, Evidence, PathwayNode, PathwayEdge } from "./types";
import { Fact } from "./observedPathway";
import { evidenceWeight } from "./confidence";

interface Dependencies {
  intended: PathwayNode[];
  observed: PathwayNode[];
  unexpected: PathwayNode[];
  edges: PathwayEdge[];
  evidence: Evidence[];
  facts: Map<string, Fact>;
}

function reliabilityOf(evidence: Evidence[]) {
  return (id: string): number | undefined => evidence.find((e) => e.id === id)?.reliability;
}

export function detectDivergences(deps: Dependencies): Divergence[] {
  const { observed, unexpected, edges, evidence, facts } = deps;
  const divergences: Divergence[] = [];
  let counter = 0;
  const rel = reliabilityOf(evidence);

  const push = (d: Omit<Divergence, "id" | "confidence">) => {
    counter += 1;
    const { weight } = evidenceWeight(d.evidenceIds, rel);
    divergences.push({
      ...d,
      id: `div_${String(counter).padStart(2, "0")}`,
      confidence: Math.max(40, Math.round(weight * 100)),
    });
  };

  // 1) Metric deviations: expected constraint on intended node violated.
  for (const node of observed) {
    if (node.status === "FAILED") {
      push({
        type: "metric_deviation",
        expected: `${node.label}: expected ${node.expectedValue ?? "within range"}`,
        observed: `${node.label}: observed ${node.observedValue ?? "unknown"}`,
        difference: `The expected constraint (${node.expectedValue}) was not met; observed ${node.observedValue ?? "unknown"}.`,
        evidenceIds: node.evidence ?? [],
      });
    }
  }

  // 2) Missing steps: intended nodes with no observed evidence.
  for (const node of observed) {
    if (node.status === "UNCERTAIN" && (!node.evidence || node.evidence.length === 0)) {
      push({
        type: "missing_step",
        expected: `${node.label} should have occurred / been measured`,
        observed: `No evidence found for ${node.label}`,
        difference: "The pathway step has no observed counterpart in the uploaded data.",
        evidenceIds: [],
      });
    }
  }

  // 3) Unexpected transitions / contradictory edges.
  for (const edge of edges) {
    if (edge.relation === "contradictory") {
      push({
        type: "unexpected_transition",
        expected: "Intended causal continuation",
        observed: `Observed link: ${edge.source} → ${edge.target}`,
        difference: edge.reason ?? "The observed transition contradicts the intended pathway.",
        evidenceIds: edge.evidence ?? [],
      });
    }
  }

  // 4) Unexpected events / external factors.
  for (const node of unexpected) {
    if (node.status === "EXTERNAL") {
      push({
        type: "external_factor",
        expected: "No external interference expected",
        observed: node.label,
        difference: `${node.label} was observed and is not part of the intended pathway.`,
        evidenceIds: node.evidence ?? [],
      });
    } else if (node.kind === "outcome") {
      push({
        type: "failed_condition",
        expected: "Target outcome achieved",
        observed: node.label,
        difference: node.description ?? "The target outcome was not achieved.",
        evidenceIds: node.evidence ?? [],
      });
    }
  }

  // 5) Contradictory evidence within dataset (e.g. conflicting rates).
  const conflictRate = facts.get("missed_with_class_conflict_pct")?.value;
  const attendanceRate = facts.get("attendance_rate_pct")?.value;
  if (conflictRate !== undefined && attendanceRate !== undefined && conflictRate < 10 && attendanceRate < 50) {
    push({
      type: "contradictory_evidence",
      expected: "Low attendance should correspond to schedule conflicts",
      observed: "Low attendance with very low conflict rate",
      difference: "Missed sessions are not explained by schedule conflicts; another cause is at play.",
      evidenceIds: facts.get("missed_with_class_conflict_pct")?.evidenceIds ?? [],
    });
  }

  return divergences.sort((a, b) => b.confidence - a.confidence);
}
