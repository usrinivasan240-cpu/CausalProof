import { describe, it, expect } from "vitest";
import { generateRecommendations } from "../lib/engine/recommendations";
import type { Fact } from "../lib/engine/observedPathway";

function makeFact(metric: string, value: number): Fact {
  return { metric, value, evidenceIds: ["ev1"], source: "test" };
}

describe("generateRecommendations", () => {
  it("generates at least 2 recommendations", () => {
    const facts = new Map([
      ["attendance_rate_pct", makeFact("attendance_rate_pct", 43)],
      ["missed_with_class_conflict_pct", makeFact("missed_with_class_conflict_pct", 68)],
      ["open_rate_pct", makeFact("open_rate_pct", 71)],
      ["risk_score_change_pct", makeFact("risk_score_change_pct", -4)],
    ]);
    const recs = generateRecommendations({ facts });
    expect(recs.length).toBeGreaterThanOrEqual(2);
  });

  it("ranks high impact before medium", () => {
    const facts = new Map([
      ["attendance_rate_pct", makeFact("attendance_rate_pct", 43)],
      ["missed_with_class_conflict_pct", makeFact("missed_with_class_conflict_pct", 68)],
    ]);
    const recs = generateRecommendations({ facts });
    const impacts = recs.map((r) => r.impact);
    const firstHigh = impacts.indexOf("High");
    const firstMedium = impacts.indexOf("Medium");
    if (firstHigh >= 0 && firstMedium >= 0) {
      expect(firstHigh).toBeLessThan(firstMedium);
    }
  });

  it("reschedule recommendation has high impact when conflict is high", () => {
    const facts = new Map([
      ["attendance_rate_pct", makeFact("attendance_rate_pct", 43)],
      ["missed_with_class_conflict_pct", makeFact("missed_with_class_conflict_pct", 68)],
    ]);
    const recs = generateRecommendations({ facts });
    const reschedule = recs.find((r) => r.title.includes("Reschedule") || r.title.includes("Move"));
    expect(reschedule).toBeDefined();
    expect(reschedule!.impact).toBe("High");
  });

  it("all recommendations have required fields", () => {
    const facts = new Map([
      ["attendance_rate_pct", makeFact("attendance_rate_pct", 43)],
      ["missed_with_class_conflict_pct", makeFact("missed_with_class_conflict_pct", 68)],
    ]);
    const recs = generateRecommendations({ facts });
    for (const rec of recs) {
      expect(rec.id).toBeTruthy();
      expect(rec.title).toBeTruthy();
      expect(rec.intervention).toBeTruthy();
      expect(rec.expectedMechanism).toBeTruthy();
      expect(typeof rec.confidence).toBe("number");
    }
  });
});
