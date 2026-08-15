// Counterfactual Redesign Lab.
//
// Deterministic, rule-based simulation engine. Every result is explicitly
// labelled ESTIMATE / SCENARIO — NOT OBSERVED FACT. The rules are simple,
// documented, and consistent, so the same inputs always produce the same
// outputs (required for the demo and for tests).

import { CounterfactualResult } from "./types";
import { Fact } from "./observedPathway";

interface Dependencies {
  facts: Map<string, Fact>;
}

const factValue = (facts: Map<string, Fact>, metric: string): number | null =>
  facts.get(metric)?.value ?? null;

function makeResult(
  metric: string,
  observed: number,
  counterfactual: number,
  assumptions: string[],
  confidence: number,
  counter: { n: number },
): CounterfactualResult {
  counter.n += 1;
  return {
    id: `cf_${String(counter.n).padStart(2, "0")}`,
    metric,
    observed,
    counterfactual,
    difference: counterfactual - observed,
    differencePct: observed !== 0 ? ((counterfactual - observed) / observed) * 100 : 0,
    assumptions,
    confidence,
    isSimulation: true,
  };
}

/**
 * Estimate the effect of moving counselling sessions out of class-conflict
 * windows. Rule: the recoverable share of the attendance gap is proportional
 * to the measured conflict rate (capped), and only a fraction of recovered
 * sessions convert because other barriers (motivation, timing) may remain.
 */
function rescheduleEstimate(attendance: number, conflictRate: number): { value: number; assumptions: string[] } {
  const gap = 100 - attendance;
  const recoverable = Math.min(1, conflictRate / 100) * gap * 0.7;
  const value = attendance + recoverable;
  return {
    value,
    assumptions: [
      "All sessions currently lost to schedule conflicts would be attended if rescheduled.",
      "Students face no other significant barriers (motivation, distance, cost).",
      "Notification and counselling content are unchanged.",
    ],
  };
}

function asyncEstimate(attendance: number): number {
  // Asynchronous sessions recover a smaller, fixed share of the gap.
  return attendance + (100 - attendance) * 0.25;
}

function capacityEstimate(riskChange: number, extraCounsellors: number): number {
  // Extra counsellors reduce average risk further in proportion to capacity.
  return riskChange - extraCounsellors * 2;
}

export interface CustomCounterfactual {
  variable?: string;
  value?: number;
}

export function runCounterfactuals(
  deps: Dependencies,
  custom?: CustomCounterfactual,
): CounterfactualResult[] {
  const { facts } = deps;
  const results: CounterfactualResult[] = [];
  const counter = { n: 0 };

  const attendance = factValue(facts, "attendance_rate_pct") ?? 50;
  const conflictRate = factValue(facts, "missed_with_class_conflict_pct") ?? 0;
  const riskChange = factValue(facts, "risk_score_change_pct") ?? 0;
  const conflictConfidence = facts.get("missed_with_class_conflict_pct")
    ? Math.min(90, 60 + conflictRate / 2)
    : 40;

  if (custom && custom.variable === "counselling_time" && custom.value !== undefined) {
    // User-driven scenario: user picks a counselling start hour.
    const hour = custom.value;
    const afterClass = hour >= 16;
    const simulated = afterClass
      ? rescheduleEstimate(attendance, conflictRate).value
      : attendance;
    results.push(
      makeResult(
        "counselling attendance rate (%)",
        attendance,
        Math.round(simulated * 10) / 10,
        afterClass
          ? [
              `Selected counselling start time: ${hour}:00, after the last class block.`,
              "Sessions previously lost to conflicts are assumed to be attended.",
            ]
          : [
              `Selected counselling start time: ${hour}:00, still overlapping class hours.`,
              "No attendance improvement is assumed while sessions remain in class windows.",
            ],
        afterClass ? conflictConfidence : 55,
        counter,
      ),
    );
    return results;
  }

  // Scenario 1 — reschedule counselling
  const reschedule = rescheduleEstimate(attendance, conflictRate);
  results.push(
    makeResult(
      "counselling attendance rate (%)",
      attendance,
      Math.round(reschedule.value * 10) / 10,
      reschedule.assumptions,
      conflictConfidence,
      counter,
    ),
  );

  // Scenario 2 — asynchronous option
  results.push(
    makeResult(
      "counselling attendance rate (%)",
      attendance,
      Math.round(asyncEstimate(attendance) * 10) / 10,
      [
        "A share of students who cannot attend synchronous sessions would use an asynchronous option.",
        "Asynchronous counselling is assumed ~40% as effective for engagement as live sessions.",
      ],
      55,
      counter,
    ),
  );

  // Scenario 3 — increased capacity
  results.push(
    makeResult(
      "mean risk score change (%)",
      riskChange,
      Math.round(capacityEstimate(riskChange, 2) * 10) / 10,
      [
        "Two additional counsellors reduce average wait time for sessions.",
        "Each counsellor is assumed to contribute ~2 percentage points of risk reduction over the period.",
      ],
      45,
      counter,
    ),
  );

  return results;
}
