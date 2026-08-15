import { describe, it, expect } from "vitest";
import { runCounterfactuals } from "../lib/engine/counterfactual";
import type { Fact } from "../lib/engine/observedPathway";

function makeFact(metric: string, value: number): Fact {
  return { metric, value, evidenceIds: ["ev1"], source: "test" };
}

describe("runCounterfactuals", () => {
  it("returns 3 predefined scenarios for student retention facts", () => {
    const facts = new Map([
      ["attendance_rate_pct", makeFact("attendance_rate_pct", 43)],
      ["missed_with_class_conflict_pct", makeFact("missed_with_class_conflict_pct", 68)],
      ["risk_score_change_pct", makeFact("risk_score_change_pct", -4)],
    ]);
    const results = runCounterfactuals({ facts });
    expect(results.length).toBe(3);
    expect(results[0].isSimulation).toBe(true);
    expect(results[0].metric).toContain("counselling");
  });

  it("reschedule scenario shows improvement when conflict is high", () => {
    const facts = new Map([
      ["attendance_rate_pct", makeFact("attendance_rate_pct", 43)],
      ["missed_with_class_conflict_pct", makeFact("missed_with_class_conflict_pct", 68)],
      ["risk_score_change_pct", makeFact("risk_score_change_pct", -4)],
    ]);
    const results = runCounterfactuals({ facts });
    const reschedule = results[0];
    expect(reschedule.counterfactual).toBeGreaterThan(reschedule.observed);
    expect(reschedule.assumptions.length).toBeGreaterThan(0);
  });

  it("handles custom counselling_time scenario", () => {
    const facts = new Map([
      ["attendance_rate_pct", makeFact("attendance_rate_pct", 43)],
      ["missed_with_class_conflict_pct", makeFact("missed_with_class_conflict_pct", 68)],
      ["risk_score_change_pct", makeFact("risk_score_change_pct", -4)],
    ]);
    const results = runCounterfactuals({ facts }, { variable: "counselling_time", value: 16 });
    expect(results.length).toBe(1);
    expect(results[0].counterfactual).toBeGreaterThan(results[0].observed);
  });

  it("custom scenario during class hours shows no improvement", () => {
    const facts = new Map([
      ["attendance_rate_pct", makeFact("attendance_rate_pct", 43)],
      ["missed_with_class_conflict_pct", makeFact("missed_with_class_conflict_pct", 68)],
      ["risk_score_change_pct", makeFact("risk_score_change_pct", -4)],
    ]);
    const results = runCounterfactuals({ facts }, { variable: "counselling_time", value: 10 });
    expect(results[0].counterfactual).toBe(results[0].observed);
  });
});
