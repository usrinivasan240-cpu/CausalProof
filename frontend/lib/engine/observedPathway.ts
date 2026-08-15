// Observed Pathway Reconstruction.
//
// Builds the observed pathway from extracted evidence facts. Every node is
// linked back to the evidence that supports its status. Nodes with no
// supporting evidence are marked UNCERTAIN rather than guessed.

import { Evidence, PathwayNode, PathwayEdge } from "./types";
import { parseConstraint, checkConstraint } from "./constraints";

export interface Fact {
  metric: string;
  value: number;
  evidenceIds: string[];
  source: string;
}

/** Collect canonical facts from evidence items' metric arrays. */
export function extractFacts(evidence: Evidence[]): Map<string, Fact> {
  const facts = new Map<string, Fact>();
  for (const e of evidence) {
    for (const m of e.metrics) {
      const existing = facts.get(m.name);
      if (existing) {
        existing.evidenceIds.push(e.id);
        existing.evidenceIds = [...new Set(existing.evidenceIds)];
        if (existing.source !== m.name) existing.source = e.source;
      } else {
        facts.set(m.name, {
          metric: m.name,
          value: m.value,
          evidenceIds: [e.id],
          source: e.source,
        });
      }
    }
  }
  return facts;
}

export function factValue(facts: Map<string, Fact>, metric: string): number | null {
  const f = facts.get(metric);
  return f ? f.value : null;
}

export function factEvidence(facts: Map<string, Fact>, metric: string): string[] {
  return facts.get(metric)?.evidenceIds ?? [];
}

/** Alias: canonical metric may appear under slightly different key. */
export function factValueAny(facts: Map<string, Fact>, metrics: string[]): number | null {
  for (const m of metrics) {
    const v = factValue(facts, m);
    if (v !== null) return v;
  }
  return null;
}

const EVENT_HINTS: Array<[string, RegExp]> = [
  ["notification", /notification|notify|alert|sms|email/i],
  ["counselling", /counsell|counsel|session|meeting/i],
  ["risk", /risk|score|flag/i],
  ["attendance", /attend/i],
  ["engagement", /engag|participat|involv/i],
  ["schedule", /schedule|class|timetable|conflict/i],
  ["dropout", /dropout|drop|retention|withdraw/i],
  ["enrol", /enrol/i],
];

function evidenceForLabel(evidence: Evidence[], label: string): Evidence[] {
  return evidence.filter((e) => EVENT_HINTS.some(([, re]) => re.test(label) && re.test(e.claim + " " + e.source)));
}

export interface ObservedPathwayResult {
  nodes: PathwayNode[];
  edges: PathwayEdge[];
  unexpectedNodes: PathwayNode[];
}

/**
 * Reconstruct the observed pathway by evaluating intended nodes against facts.
 * Adds unexpected nodes for externally-observed events (e.g. class conflicts).
 */
export function buildObservedPathway(
  intended: PathwayNode[],
  evidence: Evidence[],
  facts: Map<string, Fact>,
): ObservedPathwayResult {
  const nodes: PathwayNode[] = [];
  const unexpectedNodes: PathwayNode[] = [];
  const edgeMap = new Map<string, PathwayEdge>();
  let edgeCounter = 0;

  for (const node of intended) {
    const observed: PathwayNode = { ...node, status: "UNCERTAIN" };
    let matched = false;

    if (node.expectedMetric) {
      const value = factValue(facts, node.expectedMetric);
      if (value !== null) {
        matched = true;
        observed.observedValue = String(Math.round(value * 100) / 100);
        observed.evidence = factEvidence(facts, node.expectedMetric);
        const constraint = parseConstraint(node.expectedValue);
        const ok = constraint ? checkConstraint(constraint, value) : true;
        observed.status = ok ? "OBSERVED" : "FAILED";
        observed.kind = ok ? node.kind : "failure_point";
      }
    }

    if (!matched) {
      const hints = evidenceForLabel(evidence, node.label);
      if (hints.length > 0) {
        observed.status = "OBSERVED";
        observed.evidence = hints.map((e) => e.id);
      }
    }

    // Mechanism/outcome nodes with no numeric confirmation stay UNCERTAIN.
    nodes.push(observed);
  }

  // --- unexpected nodes driven by facts ---
  const conflictRate = factValueAny(facts, ["missed_with_class_conflict_pct", "conflict_rate_pct"]);
  if (conflictRate !== null && conflictRate >= 30) {
    unexpectedNodes.push({
      id: "n_class_conflict",
      label: "Class Schedule Conflict",
      kind: "external_factor",
      status: "EXTERNAL",
      description:
        "Scheduled counselling sessions frequently overlap with class periods, preventing attendance.",
      evidence: factEvidence(facts, "missed_with_class_conflict_pct").concat(
        factEvidence(facts, "conflict_rate_pct"),
      ),
      observedValue: `${conflictRate.toFixed(1)}%`,
    });
  }

  const riskChange = factValue(facts, "risk_score_change_pct");
  if (riskChange !== null && riskChange > -10) {
    unexpectedNodes.push({
      id: "n_dropout_remains",
      label: "Dropout Risk Remains",
      kind: "outcome",
      status: "OBSERVED",
      description: `Risk score change was ${riskChange.toFixed(1)}%, far short of the targeted reduction.`,
      evidence: factEvidence(facts, "risk_score_change_pct"),
      observedValue: `${riskChange.toFixed(1)}%`,
    });
  }

  // --- edges ---
  const addEdge = (
    source: string,
    target: string,
    relation: PathwayEdge["relation"],
    reason?: string,
    evidence?: string[],
  ) => {
    edgeCounter += 1;
    edgeMap.set(`${source}->${target}`, {
      id: `pe_${edgeCounter}`,
      source,
      target,
      relation,
      reason,
      evidence,
    });
  };

  for (let i = 0; i + 1 < nodes.length; i++) {
    const a = nodes[i];
    const b = nodes[i + 1];
    const bothObserved = a.status !== "UNCERTAIN" && b.status !== "UNCERTAIN";
    addEdge(
      a.id,
      b.id,
      bothObserved ? "observed" : "possible",
      bothObserved ? "Sequence confirmed by evidence" : "Possible continuation; evidence is thin",
      bothObserved ? [...(a.evidence ?? []), ...(b.evidence ?? [])] : undefined,
    );
  }

  // Counselling -> conflict -> low attendance branch (contradicts intended chain).
  const counsellingNode = nodes.find((n) => /counsell|counsel/i.test(n.label));
  if (counsellingNode && unexpectedNodes.some((n) => n.id === "n_class_conflict")) {
    addEdge(
      counsellingNode.id,
      "n_class_conflict",
      "observed",
      "Missed sessions overlap with scheduled classes",
      counsellingNode.evidence,
    );
    const nextIntended = nodes[nodes.indexOf(counsellingNode) + 1];
    if (nextIntended) {
      addEdge(
        "n_class_conflict",
        nextIntended.id,
        "contradictory",
        "Intended mechanism (counselling improves engagement) was interrupted by schedule conflict",
        factEvidence(facts, "missed_with_class_conflict_pct"),
      );
    }
  }

  // Dropout-risk outcome node
  const dropoutNode = nodes.find((n) => /dropout|retention|reduc/i.test(n.label));
  if (dropoutNode && unexpectedNodes.some((n) => n.id === "n_dropout_remains")) {
    addEdge(
      dropoutNode.id,
      "n_dropout_remains",
      "observed",
      "Final risk score change is far short of the target",
      factEvidence(facts, "risk_score_change_pct"),
    );
  }

  return { nodes, edges: [...edgeMap.values()], unexpectedNodes };
}
