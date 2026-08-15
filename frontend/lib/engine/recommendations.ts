// Redesign Recommendation Engine.
//
// Produces ranked, evidence-linked redesign options. Recommendations are
// hypotheses about what might work better — never guarantees. Each one lists
// its supporting evidence, assumptions and potential unintended consequences.

import { Recommendation } from "./types";
import { Fact } from "./observedPathway";

interface Dependencies {
  facts: Map<string, Fact>;
}

const factValue = (facts: Map<string, Fact>, metric: string): number | null =>
  facts.get(metric)?.value ?? null;

function evIds(facts: Map<string, Fact>, ...metrics: string[]): string[] {
  const out: string[] = [];
  for (const m of metrics) {
    const ids = facts.get(m)?.evidenceIds ?? [];
    for (const id of ids) if (!out.includes(id)) out.push(id);
  }
  return out;
}

export function generateRecommendations(deps: Dependencies): Recommendation[] {
  const { facts } = deps;
  const recs: Recommendation[] = [];

  const attendance = factValue(facts, "attendance_rate_pct");
  const conflictRate = factValue(facts, "missed_with_class_conflict_pct");
  const openRate = factValue(facts, "open_rate_pct");
  const riskChange = factValue(facts, "risk_score_change_pct");

  if (attendance !== null && conflictRate !== null && conflictRate >= 30) {
    recs.push({
      id: "rec_01",
      title: "Move counselling sessions to after-class windows",
      intervention: "Reschedule counselling to 16:00 or later, outside all class blocks",
      expectedMechanism: "Removes the dominant access barrier, allowing students to attend the sessions they are currently missing",
      supportingEvidence: evIds(facts, "missed_with_class_conflict_pct", "attendance_rate_pct", "conflict_rate_pct"),
      assumptions: [
        "No other attendance barriers exist (motivation, distance, cost).",
        "Counselling content and counsellor capacity are unchanged.",
      ],
      expectedBenefit: `Recover up to ${Math.round((100 - attendance) * Math.min(1, conflictRate / 100) * 0.7)} percentage points of counselling attendance (simulated).`,
      impact: "High",
      complexity: "Low",
      unintendedConsequences: [
        "Evening sessions may conflict with part-time jobs or family responsibilities.",
        "Counsellors may need overtime or adjusted contracts.",
      ],
      confidence: Math.min(90, 60 + conflictRate / 2),
    });
  }

  if (attendance !== null) {
    recs.push({
      id: "rec_02",
      title: "Add asynchronous counselling option",
      intervention: "Provide recorded or chat-based counselling for students who cannot attend live sessions",
      expectedMechanism: "Expands access for students whose schedules cannot accommodate fixed live sessions",
      supportingEvidence: evIds(facts, "attendance_rate_pct"),
      assumptions: [
        "Asynchronous engagement translates into similar behavioural outcomes.",
        "Students have device and internet access.",
      ],
      expectedBenefit: `Recover ~${Math.round((100 - attendance) * 0.25)} percentage points of counselling attendance (simulated).`,
      impact: "Medium",
      complexity: "Medium",
      unintendedConsequences: [
        "Reduced quality of interaction may weaken the counselling effect.",
        "Platform cost and onboarding effort.",
      ],
      confidence: 55,
    });
  }

  if (openRate !== null && openRate < 75) {
    recs.push({
      id: "rec_03",
      title: "Improve notification timing and channel",
      intervention: "Send invitations earlier and via a channel with higher open rates",
      expectedMechanism: "Students learn about sessions sooner and more reliably, increasing scheduling and attendance",
      supportingEvidence: evIds(facts, "open_rate_pct", "delivery_rate_pct"),
      assumptions: [
        "Higher open rates lead to higher session scheduling.",
        "Notification infrastructure can support earlier sends.",
      ],
      expectedBenefit: "Increase session scheduling by improving reach from the current open rate.",
      impact: "Medium",
      complexity: "Low",
      unintendedConsequences: ["Notification fatigue may reduce response over time."],
      confidence: 50,
    });
  }

  recs.push({
    id: "rec_04",
    title: "Increase counsellor capacity",
    intervention: "Hire or redeploy additional counsellors to reduce wait times",
    expectedMechanism: "Faster access to counselling sessions increases utilisation and engagement",
    supportingEvidence: evIds(facts, "risk_score_change_pct", "attendance_rate_pct"),
    assumptions: [
      "Additional counsellors are available and affordable.",
      "Wait time is a meaningful barrier.",
    ],
    expectedBenefit:
      riskChange !== null && riskChange > -20
        ? "Potential to move mean risk-score change closer to the -20% target."
        : "Marginal benefit on already-healthy trajectory.",
    impact: "Medium",
    complexity: "High",
    unintendedConsequences: [
      "Cost and supervision burden.",
      "Short-term disruption while staff are trained.",
    ],
    confidence: 45,
  });

  // Rank: impact weight then complexity (lower complexity better).
  const impactRank = { High: 0, Medium: 1, Low: 2 } as const;
  const complexityRank = { Low: 0, Medium: 1, High: 2 } as const;
  recs.sort(
    (a, b) =>
      impactRank[a.impact] - impactRank[b.impact] ||
      complexityRank[a.complexity] - complexityRank[b.complexity] ||
      b.confidence - a.confidence,
  );
  return recs;
}
