// Causal Hypothesis Engine.
//
// Generates competing hypotheses about why the intended pathway diverged.
// Hypotheses are labelled with calibrated statuses (SUPPORTED / POSSIBLE /
// UNCERTAIN / INSUFFICIENT_EVIDENCE). The engine always surfaces at least
// one alternative explanation and one measurement caveat, and never asserts
// unproven causation as fact.

import { Evidence, Hypothesis, FailureCategory, Divergence } from "./types";
import { Fact } from "./observedPathway";
import { combinedConfidence, statusFromConfidence } from "./confidence";

interface Dependencies {
  evidence: Evidence[];
  facts: Map<string, Fact>;
  divergences: Divergence[];
}

const reliabilityOf = (evidence: Evidence[]) => (id: string): number | undefined =>
  evidence.find((e) => e.id === id)?.reliability;

function factEvidence(facts: Map<string, Fact>, metric: string): string[] {
  return facts.get(metric)?.evidenceIds ?? [];
}

function factValue(facts: Map<string, Fact>, metric: string): number | null {
  return facts.get(metric)?.value ?? null;
}

export function generateHypotheses(deps: Dependencies): Hypothesis[] {
  const { evidence, facts, divergences } = deps;
  const hypotheses: Hypothesis[] = [];
  const rel = reliabilityOf(evidence);
  let counter = 0;

  const make = (
    cause: string,
    effect: string,
    failureCategory: FailureCategory,
    supporting: string[],
    contradicting: string[],
    alternatives: string[],
  ): Hypothesis => {
    counter += 1;
    const supportWeight = supporting.reduce(
      (acc, id) => acc + (rel(id) ?? 0),
      0,
    );
    const contradictionWeight = contradicting.reduce(
      (acc, id) => acc + (rel(id) ?? 0),
      0,
    );
    const support = Math.min(1, supportWeight);
    const contradiction = Math.min(1, contradictionWeight);
    const confidence = combinedConfidence({ supporting: support, contradicting: contradiction, coverage: 1 });
    const status = statusFromConfidence(confidence, supporting.length);
    return {
      id: `hyp_${String(counter).padStart(2, "0")}`,
      cause,
      effect,
      failureCategory,
      supportingEvidence: supporting,
      contradictingEvidence: contradicting,
      alternativeExplanations: alternatives,
      confidence,
      status,
      isLeading: false,
    };
  };

  const attendanceRate = factValue(facts, "attendance_rate_pct");
  const conflictRate = factValue(facts, "missed_with_class_conflict_pct");
  const openRate = factValue(facts, "open_rate_pct");
  const riskChange = factValue(facts, "risk_score_change_pct");

  // Hypothesis A — implementation / access failure (leading in demo)
  if (attendanceRate !== null && attendanceRate < 60) {
    const supporting = [
      ...factEvidence(facts, "attendance_rate_pct"),
      ...factEvidence(facts, "missed_with_class_conflict_pct"),
    ];
    const contradicting = factValue(facts, "conflict_rate_pct") !== null && conflictRate! < 20
      ? factEvidence(facts, "conflict_rate_pct")
      : [];
    const h = make(
      "Intervention was not delivered as designed",
      "Counselling sessions are scheduled during class periods, so students cannot attend",
      "implementation",
      supporting,
      contradicting,
      ["Notification timing (late or low-open-rate messages)", "Student motivation / engagement", "Measurement error in attendance records"],
    );
    if (conflictRate !== null && conflictRate >= 40) {
      h.cause = `Class scheduling conflict overlaps ${conflictRate.toFixed(0)}% of missed counselling sessions`;
    }
    h.isLeading = true;
    hypotheses.push(h);
  }

  // Hypothesis B — mechanism failure (possible)
  const engagementEvidence = factValue(facts, "attendance_trend_change");
  hypotheses.push(
    make(
      "The intervention occurred but the expected mechanism did not activate",
      "Attendance and risk scores barely moved even where counselling was delivered",
      "mechanism",
      engagementEvidence !== null ? factEvidence(facts, "attendance_trend_change") : [],
      [],
      ["Implementation failure", "Measurement failure", "Context factors"],
    ),
  );

  // Hypothesis C — notification / design variant (possible alternative)
  if (openRate !== null && openRate < 65) {
    hypotheses.push(
      make(
        "Students were notified too late or through a low-engagement channel",
        "Many at-risk students never saw the counselling invitation",
        "design",
        factEvidence(facts, "open_rate_pct"),
        [],
        ["Class schedule conflict", "Student motivation"],
      ),
    );
  }

  // Hypothesis D — context failure (possible)
  if (riskChange !== null && riskChange > -10) {
    hypotheses.push(
      make(
        "The intervention works under some conditions but not in this cohort context",
        "Risk remained high for a substantial sub-group",
        "context",
        [],
        [],
        ["Implementation failure", "Design failure", "External events"],
      ),
    );
  }

  // Hypothesis E — measurement / data failure (always presented as caveat)
  hypotheses.push(
    make(
      "Observed outcomes may be distorted by incomplete or biased records",
      "Attendance and risk metrics rest on self-reported or partially recorded data",
      "measurement",
      divergences.filter((d) => d.type === "missing_step").flatMap((d) => d.evidenceIds),
      [],
      ["True implementation failure"],
    ),
  );

  // Ensure at least one hypothesis is always present.
  if (hypotheses.length === 0) {
    hypotheses.push(
      make(
        "The cause of the divergence cannot be established from the available data",
        "The intended pathway diverged from the observed pathway",
        "design",
        [],
        [],
        [],
      ),
    );
  }

  // Sort by confidence descending; keep leading flag on strongest.
  const sorted = hypotheses.sort((a, b) => b.confidence - a.confidence);
  const leading = sorted.find((h) => h.status === "SUPPORTED") ?? sorted[0];
  for (const h of sorted) h.isLeading = h.id === leading.id;

  return sorted;
}
