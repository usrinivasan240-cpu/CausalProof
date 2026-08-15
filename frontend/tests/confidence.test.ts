import { describe, it, expect } from "vitest";
import { evidenceWeight, combinedConfidence, statusFromConfidence } from "../lib/engine/confidence";

describe("Confidence", () => {
  it("evidenceWeight returns 0 for empty evidence", () => {
    expect(evidenceWeight([], () => undefined)).toEqual({ weight: 0, count: 0 });
  });

  it("evidenceWeight increases with more reliable evidence", () => {
    const rel = (id: string) => (id === "e1" ? 0.9 : undefined);
    const w1 = evidenceWeight(["e1"], rel);
    const w2 = evidenceWeight(["e1", "e2"], (id) => (id === "e1" ? 0.9 : id === "e2" ? 0.8 : undefined));
    expect(w2.weight).toBeGreaterThan(w1.weight);
  });

  it("combinedConfidence returns value between 0 and 100", () => {
    const c1 = combinedConfidence({ supporting: 0.8, contradicting: 0.1, coverage: 1 });
    expect(c1).toBeGreaterThanOrEqual(0);
    expect(c1).toBeLessThanOrEqual(100);
  });

  it("contradiction reduces confidence", () => {
    const high = combinedConfidence({ supporting: 0.8, contradicting: 0, coverage: 1 });
    const low = combinedConfidence({ supporting: 0.8, contradicting: 0.5, coverage: 1 });
    expect(low).toBeLessThan(high);
  });

  it("statusFromConfidence returns INSUFFICIENT_EVIDENCE for no evidence", () => {
    expect(statusFromConfidence(50, 0)).toBe("INSUFFICIENT_EVIDENCE");
  });

  it("statusFromConfidence returns SUPPORTED for high confidence + many evidence", () => {
    expect(statusFromConfidence(70, 3)).toBe("SUPPORTED");
  });

  it("statusFromConfidence returns POSSIBLE for moderate confidence", () => {
    expect(statusFromConfidence(50, 2)).toBe("POSSIBLE");
  });

  it("statusFromConfidence returns POSSIBLE for moderate confidence", () => {
    expect(statusFromConfidence(40, 1)).toBe("POSSIBLE");
  });
});
