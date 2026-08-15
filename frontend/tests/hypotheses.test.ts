import { describe, it, expect } from "vitest";
import { generateHypotheses } from "../lib/engine/hypotheses";
import type { Divergence, Evidence } from "../lib/engine/types";
import type { Fact } from "../lib/engine/observedPathway";

function makeFact(metric: string, value: number, evidenceIds: string[]): Fact {
  return { metric, value, evidenceIds, source: "test" };
}

function makeEvidence(id: string, reliability = 0.9): Evidence {
  return {
    id,
    source: "test",
    sourceType: "DATASET",
    claim: `Evidence ${id}`,
    entities: [],
    metrics: [],
    reliability,
    extractionConfidence: 0.9,
  };
}

describe("generateHypotheses", () => {
  it("generates at least one hypothesis when attendance is low", () => {
    const evidence = [makeEvidence("ev1"), makeEvidence("ev2")];
    const facts = new Map([
      ["attendance_rate_pct", makeFact("attendance_rate_pct", 43, ["ev1"])],
      ["missed_with_class_conflict_pct", makeFact("missed_with_class_conflict_pct", 68, ["ev2"])],
      ["risk_score_change_pct", makeFact("risk_score_change_pct", -4, ["ev1"])],
    ]);
    const divergences: Divergence[] = [];
    const hypotheses = generateHypotheses({ evidence, facts, divergences });
    expect(hypotheses.length).toBeGreaterThan(0);
    expect(hypotheses.some((h) => h.isLeading)).toBe(true);
  });

  it("labels hypotheses with calibrated statuses", () => {
    const evidence = [makeEvidence("ev1"), makeEvidence("ev2")];
    const facts = new Map([
      ["attendance_rate_pct", makeFact("attendance_rate_pct", 43, ["ev1"])],
      ["missed_with_class_conflict_pct", makeFact("missed_with_class_conflict_pct", 68, ["ev2"])],
    ]);
    const hypotheses = generateHypotheses({ evidence, facts, divergences: [] });
    for (const h of hypotheses) {
      expect(["SUPPORTED", "POSSIBLE", "UNCERTAIN", "INSUFFICIENT_EVIDENCE"]).toContain(h.status);
    }
  });

  it("includes measurement caveat hypothesis", () => {
    const evidence = [makeEvidence("ev1")];
    const facts = new Map([
      ["attendance_rate_pct", makeFact("attendance_rate_pct", 43, ["ev1"])],
    ]);
    const hypotheses = generateHypotheses({ evidence, facts, divergences: [] });
    expect(hypotheses.some((h) => h.failureCategory === "measurement")).toBe(true);
  });
});
