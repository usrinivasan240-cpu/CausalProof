import { describe, it, expect } from "vitest";
import { extractEvidence, resetEvidenceCounter } from "../lib/engine/evidence";
import type { IngestedFile } from "../lib/engine/evidence";

function csvFile(name: string, csv: string): IngestedFile {
  return {
    fileName: name,
    mimeType: "text/csv",
    sizeBytes: Buffer.byteLength(csv),
    kind: "csv",
    csvRows: csv.split("\n").filter((l) => l.trim()).map((l) => {
      const [k, v] = l.split(",");
      return { [csv.split("\n")[0].split(",")[0]]: k, dummy: v };
    }),
    jsonData: [],
    rawText: csv,
  };
}

describe("extractEvidence", () => {
  it("extracts generic numeric evidence from CSV", () => {
    resetEvidenceCounter();
    const csv = "score\n85\n90\n75";
    const rows = csv.split("\n").slice(1).map((v) => ({ score: v }));
    const file: IngestedFile = {
      fileName: "scores.csv",
      mimeType: "text/csv",
      sizeBytes: 100,
      kind: "csv",
      csvRows: rows,
      jsonData: [],
      rawText: csv,
    };
    const result = extractEvidence([file]);
    expect(result.evidence.length).toBeGreaterThan(0);
    const scoreEvidence = result.evidence.find((e) => e.claim.includes("score"));
    expect(scoreEvidence).toBeDefined();
    expect(scoreEvidence!.metrics.length).toBeGreaterThan(0);
  });

  it("produces INSUFFICIENT_EVIDENCE for PDF", () => {
    resetEvidenceCounter();
    const file: IngestedFile = {
      fileName: "report.pdf",
      mimeType: "application/pdf",
      sizeBytes: 5000,
      kind: "pdf",
      csvRows: [],
      jsonData: [],
      rawText: "",
    };
    const result = extractEvidence([file]);
    expect(result.evidence.length).toBe(1);
    expect(result.evidence[0].claim).toContain("Insufficient evidence");
  });

  it("extracts text evidence from statements", () => {
    resetEvidenceCounter();
    const file: IngestedFile = {
      fileName: "notes.txt",
      mimeType: "text/plain",
      sizeBytes: 200,
      kind: "txt",
      csvRows: [],
      jsonData: [],
      rawText: "Teachers observed decreased attendance. Students reported increased stress levels.",
    };
    const result = extractEvidence([file]);
    expect(result.evidence.length).toBeGreaterThanOrEqual(2);
  });

  it("returns error for empty JSON", () => {
    resetEvidenceCounter();
    const file: IngestedFile = {
      fileName: "data.json",
      mimeType: "application/json",
      sizeBytes: 50,
      kind: "json",
      csvRows: [],
      jsonData: [],
      rawText: "[]",
    };
    const result = extractEvidence([file]);
    expect(result.evidence.length).toBe(1);
    expect(result.summaries[0].rowCount).toBe(0);
  });

  it("extracts counselling demo evidence", () => {
    resetEvidenceCounter();
    const rows = [
      { student_id: "S1", scheduled: "1", attended: "1", conflict_with_class: "0" },
      { student_id: "S2", scheduled: "1", attended: "0", conflict_with_class: "1" },
      { student_id: "S3", scheduled: "1", attended: "0", conflict_with_class: "1" },
      { student_id: "S4", scheduled: "1", attended: "1", conflict_with_class: "0" },
    ];
    const file: IngestedFile = {
      fileName: "counselling.csv",
      mimeType: "text/csv",
      sizeBytes: 200,
      kind: "csv",
      csvRows: rows,
      jsonData: [],
      rawText: "",
    };
    const result = extractEvidence([file]);
    expect(result.evidence.length).toBeGreaterThanOrEqual(2);
    const attendanceClaim = result.evidence.find((e) => e.claim.includes("Counselling sessions"));
    expect(attendanceClaim).toBeDefined();
    expect(attendanceClaim!.metrics.length).toBeGreaterThan(0);
  });
});
