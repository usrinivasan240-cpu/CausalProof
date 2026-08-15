// Demo Mode — loads synthetic data, runs the deterministic analysis pipeline,
// and persists the results so the UI can display everything without external APIs.

import { parseDataFile, parseCsvToObjects } from "@/lib/engine/csv";
import { extractEvidence, IngestedFile, resetEvidenceCounter } from "@/lib/engine/evidence";
import { runAnalysis, PipelineInput } from "@/lib/engine/pipeline";
import {
  Investigation,
  PathwayNode,
  UploadedFileSummary,
} from "@/lib/engine/types";
import {
  saveInvestigation,
  saveIntended,
  saveEvidence,
  saveUploads,
  saveReport,
  getInvestigation,
  getReport,
  demoDir,
} from "@/lib/storage";
import {
  generateDemoFiles,
  demoIntendedPathway,
  demoInvestigation,
  DemoFile,
} from "./generate";
import { writeFileSync, existsSync, readFileSync } from "fs";
import { join } from "path";

/** Write demo files to disk if not already present. */
function ensureDemoFiles(): DemoFile[] {
  const dir = demoDir();
  const files = generateDemoFiles();
  for (const f of files) {
    const fp = join(dir, f.name);
    if (!existsSync(fp)) {
      writeFileSync(fp, f.content, "utf-8");
    }
  }
  return files;
}

/** Read demo file back from disk. */
function readDemoFile(name: string): IngestedFile {
  const dir = demoDir();
  const fp = join(dir, name);
  const content = readFileSync(fp, "utf-8");
  const { kind, csvRows, jsonData, rawText } = parseDataFile(content, name);
  const ext = name.split(".").pop() ?? "";
  return {
    fileName: name,
    mimeType: ext === "csv" ? "text/csv" : ext === "txt" ? "text/plain" : "application/json",
    sizeBytes: Buffer.byteLength(content, "utf-8"),
    kind: kind as "csv" | "json" | "txt",
    csvRows,
    jsonData,
    rawText,
  };
}

export function loadDemo(): { investigation: Investigation; report: ReturnType<typeof runAnalysis> } {
  const existing = getInvestigation("inv_demo_retention");
  const existingReport = getReport("inv_demo_retention");
  if (existing && existingReport && existing.status === "ANALYZED") {
    return { investigation: existing, report: existingReport };
  }

  ensureDemoFiles();
  resetEvidenceCounter();

  const investigation = demoInvestigation();
  investigation.status = "DRAFT";
  saveInvestigation(investigation);

  const intendedNodes = demoIntendedPathway();
  saveIntended(investigation.id, intendedNodes);

  const fileNames = [
    "students.csv",
    "attendance.csv",
    "risk_scores.csv",
    "counselling.csv",
    "notification_logs.csv",
    "class_schedule.csv",
    "case_notes.txt",
  ];

  const ingested: IngestedFile[] = fileNames.map((n) => readDemoFile(n));
  const { evidence, summaries, errors } = extractEvidence(ingested);

  const uploadSummaries: UploadedFileSummary[] = summaries.map((s, i) => ({
    id: `upload_${i + 1}`,
    investigationId: investigation.id,
    fileName: s.fileName,
    mimeType: ingested[i]?.mimeType ?? "text/csv",
    sizeBytes: s.sizeBytes,
    contentType: s.type,
    uploadedAt: new Date().toISOString(),
    summary: s,
    evidenceIds: evidence
      .filter((e) => e.fileName === s.fileName)
      .map((e) => e.id),
  }));

  saveEvidence(investigation.id, evidence);
  saveUploads(investigation.id, uploadSummaries);

  const input: PipelineInput = {
    investigation,
    intendedNodes,
    evidence,
    dataSources: summaries,
    aiSource: "deterministic",
    aiNote: "Analysis performed by the deterministic rule-based engine. No external LLM was used.",
  };

  const report = runAnalysis(input);
  investigation.status = "ANALYZED";
  investigation.lastAnalysisAt = report.generatedAt;
  saveInvestigation(investigation);
  saveReport(investigation.id, report);

  return { investigation, report };
}
