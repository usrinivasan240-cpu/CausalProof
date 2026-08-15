import { describe, it, expect } from "vitest";
import { detectDivergences } from "../lib/engine/divergence";
import type { PathwayNode, PathwayEdge, Evidence } from "../lib/engine/types";
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

describe("detectDivergences", () => {
  it("detects metric deviations for FAILED nodes", () => {
    const intended: PathwayNode[] = [
      { id: "n1", label: "Step 1", kind: "mechanism", status: "EXPECTED", expectedMetric: "rate", expectedValue: ">= 80" },
    ];
    const observed: PathwayNode[] = [
      { id: "n1", label: "Step 1", kind: "failure_point", status: "FAILED", observedValue: "43", evidence: ["ev1"] },
    ];
    const evidence = [makeEvidence("ev1")];
    const facts = new Map([["rate", makeFact("rate", 43, ["ev1"])]]);

    const divs = detectDivergences({ intended, observed, unexpected: [], edges: [], evidence, facts });
    expect(divs.length).toBeGreaterThanOrEqual(1);
    expect(divs[0].type).toBe("metric_deviation");
    expect(divs[0].evidenceIds).toContain("ev1");
  });

  it("detects missing steps for UNCERTAIN nodes", () => {
    const intended: PathwayNode[] = [
      { id: "n1", label: "Step 1", kind: "mechanism", status: "EXPECTED" },
    ];
    const observed: PathwayNode[] = [
      { id: "n1", label: "Step 1", kind: "mechanism", status: "UNCERTAIN" },
    ];
    const divs = detectDivergences({
      intended, observed, unexpected: [], edges: [], evidence: [], facts: new Map(),
    });
    expect(divs.some((d) => d.type === "missing_step")).toBe(true);
  });

  it("detects external factors", () => {
    const unexpected: PathwayNode[] = [
      { id: "ext1", label: "External Event", kind: "external_factor", status: "EXTERNAL" },
    ];
    const divs = detectDivergences({
      intended: [], observed: [], unexpected, edges: [], evidence: [], facts: new Map(),
    });
    expect(divs.some((d) => d.type === "external_factor")).toBe(true);
  });

  it("detects contradictory edges", () => {
    const edges: PathwayEdge[] = [
      { id: "e1", source: "n1", target: "n2", relation: "contradictory", reason: "Unexpected" },
    ];
    const divs = detectDivergences({
      intended: [], observed: [], unexpected: [], edges, evidence: [], facts: new Map(),
    });
    expect(divs.some((d) => d.type === "unexpected_transition")).toBe(true);
  });
});
