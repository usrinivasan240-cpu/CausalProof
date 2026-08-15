import { describe, it, expect } from "vitest";
import { runAnalysis } from "../lib/engine/pipeline";
import { extractEvidence, resetEvidenceCounter } from "../lib/engine/evidence";
import { demoIntendedPathway, demoInvestigation } from "../lib/demo/generate";
import { generateDemoFiles } from "../lib/demo/generate";
import { parseDataFile } from "../lib/engine/csv";
import type { IngestedFile } from "../lib/engine/evidence";

describe("full pipeline integration", () => {
  it("produces a complete analysis report from demo data", () => {
    resetEvidenceCounter();
    const demoFiles = generateDemoFiles();
    const ingested: IngestedFile[] = demoFiles.map((f) => {
      const { kind, csvRows, jsonData, rawText } = parseDataFile(f.content, f.name);
      return {
        fileName: f.name,
        mimeType: f.mimeType,
        sizeBytes: Buffer.byteLength(f.content),
        kind: kind as "csv" | "json" | "txt",
        csvRows,
        jsonData,
        rawText,
      };
    });
    const { evidence, summaries } = extractEvidence(ingested);
    const investigation = demoInvestigation();
    const intendedNodes = demoIntendedPathway();

    const report = runAnalysis({
      investigation,
      intendedNodes,
      evidence,
      dataSources: summaries,
      aiSource: "deterministic",
    });

    // Executive summary exists
    expect(report.executiveSummary.length).toBeGreaterThan(50);

    // Intended pathway matches input
    expect(report.intendedPathway.length).toBe(intendedNodes.length);

    // Observed pathway is reconstructed
    expect(report.observedPathway.length).toBeGreaterThanOrEqual(intendedNodes.length);

    // Divergences detected
    expect(report.divergences.length).toBeGreaterThan(0);
    expect(report.divergences[0].id).toBeTruthy();

    // Hypotheses generated
    expect(report.hypotheses.length).toBeGreaterThan(0);
    const leading = report.hypotheses.find((h) => h.isLeading);
    expect(leading).toBeDefined();

    // Evidence linked
    expect(report.evidence.length).toBeGreaterThan(0);
    expect(report.confidence).toBeGreaterThan(0);

    // Counterfactuals
    expect(report.counterfactuals.length).toBeGreaterThan(0);
    expect(report.counterfactuals[0].isSimulation).toBe(true);

    // Recommendations
    expect(report.recommendations.length).toBeGreaterThan(0);
    expect(report.recommendations[0].title).toBeTruthy();

    // Missing info + limitations
    expect(report.missingInformation.length).toBeGreaterThan(0);
    expect(report.limitations.length).toBeGreaterThan(0);
  });
});
