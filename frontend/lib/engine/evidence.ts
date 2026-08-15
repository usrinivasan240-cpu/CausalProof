// Evidence Extraction Engine.
//
// PRINCIPLE: evidence is derived only from real uploaded content.
// The engine never invents claims. If a file cannot be parsed into
// structured evidence, an INSUFFICIENT_EVIDENCE item is produced and
// the claim is labelled as such.

import { Evidence, DataSourceSummary } from "./types";
import {
  countMissing,
  countDuplicates,
  detectDateFields,
  detectIdentifiers,
  inferColumnTypes,
} from "./csv";

export interface IngestedFile {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  kind: "csv" | "json" | "txt" | "pdf";
  csvRows: Record<string, string>[];
  jsonData: unknown[];
  rawText: string;
  rawBytes?: Uint8Array;
}

let evidenceCounter = 0;
export function resetEvidenceCounter(): void {
  evidenceCounter = 0;
}
function nextEvidenceId(): string {
  evidenceCounter += 1;
  return `ev_${String(evidenceCounter).padStart(4, "0")}`;
}

const num = (v: string): number | null => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const pct = (part: number, whole: number): number => (whole > 0 ? (part / whole) * 100 : 0);

const norm = (s: string): string => s.toLowerCase().replace(/[\s_-]+/g, "");

// ---- helpers ---------------------------------------------------------------

function mean(vals: number[]): number | null {
  if (vals.length === 0) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function numericValues(rows: Record<string, string>[], col: string): number[] {
  return rows
    .map((r) => num(r[col]))
    .filter((v): v is number => v !== null);
}

function columnMatch(rows: Record<string, string>[], candidates: string[]): string | null {
  if (rows.length === 0) return null;
  const keys = Object.keys(rows[0]);
  const byName = keys.find((k) => {
    const n = norm(k);
    return candidates.some((c) => n === norm(c));
  });
  if (byName) return byName;
  return keys.find((k) => {
    const n = norm(k);
    return candidates.some((c) => n.includes(norm(c)) || norm(c).includes(n));
  }) ?? null;
}

function booleanCounts(rows: Record<string, string>[], col: string): { yes: number; no: number; total: number } {
  let yes = 0;
  let no = 0;
  for (const r of rows) {
    const v = (r[col] ?? "").toLowerCase();
    if (["1", "true", "yes", "y", "t"].includes(v)) yes++;
    else if (["0", "false", "no", "n", "f"].includes(v)) no++;
  }
  return { yes, no, total: rows.length };
}

function firstRows(rows: Record<string, string>[], col: string, n: number): Record<string, string>[] {
  return rows.slice(0, n);
}

function ev(
  claim: string,
  opts: Partial<Evidence> = {},
): Evidence {
  return {
    id: nextEvidenceId(),
    source: opts.source ?? "analysis",
    sourceType: opts.sourceType ?? "DATASET",
    claim,
    timestamp: opts.timestamp,
    entities: opts.entities ?? [],
    metrics: opts.metrics ?? [],
    reliability: opts.reliability ?? 0.8,
    extractionConfidence: opts.extractionConfidence ?? 0.9,
    fileName: opts.fileName,
    rowIndex: opts.rowIndex,
  };
}

// ---- generic CSV evidence ---------------------------------------------------

function genericCsvEvidence(rows: Record<string, string>[], fileName: string): Evidence[] {
  const items: Evidence[] = [];
  if (rows.length === 0) return items;
  const types = inferColumnTypes(rows);
  for (const [col, type] of Object.entries(types)) {
    if (type !== "number") continue;
    const vals = numericValues(rows, col);
    const m = mean(vals);
    if (m === null) continue;
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    items.push(
      ev(
        `Column "${col}" in ${fileName} has mean ${m.toFixed(2)} over ${vals.length} rows (min ${min}, max ${max}).`,
        {
          source: fileName,
          metrics: [{ name: col, value: m }],
          reliability: 0.7,
          extractionConfidence: 0.9,
          fileName,
        },
      ),
    );
  }
  return items;
}

// ---- demo-schema CSV evidence -----------------------------------------------

function csvIs(fileName: string, token: string): boolean {
  return norm(fileName).includes(norm(token));
}

function extractDemoEvidence(rows: Record<string, string>[], fileName: string): Evidence[] {
  const items: Evidence[] = [];
  const add = (e: Evidence) => items.push(e);

  if (csvIs(fileName, "counselling") || csvIs(fileName, "counsel")) {
    const attendedCol = columnMatch(rows, ["attended", "attendance", "participated"]) ?? "attended";
    const conflictCol = columnMatch(rows, ["conflict", "conflict_with_class", "scheduled_overlap"]) ?? "conflict_with_class";
    const scheduledCol = columnMatch(rows, ["scheduled", "session_scheduled"]) ?? "scheduled";
    const attended = booleanCounts(rows, attendedCol);
    add(
      ev(
        `Counselling sessions: ${attended.total} scheduled, ${attended.yes} attended, ${attended.no} missed. Attendance rate ${pct(attended.yes, attended.total).toFixed(1)}%.`,
        {
          source: fileName,
          metrics: [
            { name: "sessions_scheduled", value: attended.total },
            { name: "sessions_attended", value: attended.yes },
            { name: "attendance_rate_pct", value: pct(attended.yes, attended.total) },
          ],
          reliability: 0.95,
          fileName,
        },
      ),
    );
    if (attended.no > 0) {
      const conflict = booleanCounts(rows, conflictCol);
      const missed = firstRows(rows, conflictCol, 10000).filter(
        (r) => ["0", "false", "no", "n", "f"].includes((r[attendedCol] ?? "").toLowerCase()),
      );
      const missedWithConflict = missed.filter((r) =>
        ["1", "true", "yes", "y", "t"].includes((r[conflictCol] ?? "").toLowerCase()),
      );
      const conflictRate = missed.length > 0 ? pct(missedWithConflict.length, missed.length) : 0;
      add(
        ev(
          `Of ${missed.length} missed counselling sessions, ${missedWithConflict.length} (${conflictRate.toFixed(1)}%) overlap with a scheduled class.`,
          {
            source: fileName,
            metrics: [{ name: "missed_with_class_conflict_pct", value: conflictRate }],
            reliability: 0.95,
            extractionConfidence: 0.95,
            fileName,
          },
        ),
      );
      add(
        ev(
          `Class-schedule conflict column indicates ${conflict.yes} conflicting sessions out of ${conflict.total} recorded (${pct(conflict.yes, conflict.total).toFixed(1)}%).`,
          {
            source: fileName,
            metrics: [{ name: "conflict_rate_pct", value: pct(conflict.yes, conflict.total) }],
            reliability: 0.9,
            fileName,
          },
        ),
      );
    }
    const scheduledCheck = booleanCounts(rows, scheduledCol);
    if (scheduledCheck.total > 0) {
      add(
        ev(
          `Session scheduling flags: ${scheduledCheck.yes} scheduled vs ${scheduledCheck.no} not recorded as scheduled out of ${scheduledCheck.total} rows.`,
          { source: fileName, reliability: 0.8, fileName },
        ),
      );
    }
  }

  if (csvIs(fileName, "notification")) {
    const deliveredCol = columnMatch(rows, ["delivered"]) ?? "delivered";
    const openedCol = columnMatch(rows, ["opened"]) ?? "opened";
    const delivered = booleanCounts(rows, deliveredCol);
    const opened = booleanCounts(rows, openedCol);
    add(
      ev(
        `Notifications: ${delivered.total} sent, ${delivered.yes} delivered (${pct(delivered.yes, delivered.total).toFixed(1)}%), ${opened.yes} opened (${pct(opened.yes, opened.total).toFixed(1)}%).`,
        {
          source: fileName,
          metrics: [
            { name: "notifications_sent", value: delivered.total },
            { name: "delivery_rate_pct", value: pct(delivered.yes, delivered.total) },
            { name: "open_rate_pct", value: pct(opened.yes, opened.total) },
          ],
          reliability: 0.9,
          fileName,
        },
      ),
    );
  }

  if (csvIs(fileName, "risk")) {
    const scoreCol = columnMatch(rows, ["risk_score", "risk", "score"]) ?? "risk_score";
    const weekCol = columnMatch(rows, ["week", "period", "date"]) ?? "week";
    const vals = numericValues(rows, scoreCol);
    if (vals.length > 0) {
      const first = firstRows(rows, scoreCol, 10000);
      const weeks = new Map<string, number[]>();
      for (const r of first) {
        const wk = r[weekCol] ?? "?";
        const v = num(r[scoreCol]);
        if (v !== null) {
          if (!weeks.has(wk)) weeks.set(wk, []);
          weeks.get(wk)!.push(v);
        }
      }
      const sortedWeeks = [...weeks.entries()].sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }));
      let trend = 0;
      if (sortedWeeks.length >= 2) {
        const firstAvg = mean(sortedWeeks[0][1]) ?? 0;
        const lastAvg = mean(sortedWeeks[sortedWeeks.length - 1][1]) ?? 0;
        trend = firstAvg > 0 ? ((lastAvg - firstAvg) / firstAvg) * 100 : 0;
        add(
          ev(
            `Average risk score changed from ${firstAvg.toFixed(1)} (${sortedWeeks[0][0]}) to ${lastAvg.toFixed(1)} (${sortedWeeks[sortedWeeks.length - 1][0]}), a ${trend >= 0 ? "+" : ""}${trend.toFixed(1)}% change over the period.`,
            {
              source: fileName,
              metrics: [{ name: "risk_score_change_pct", value: trend }],
              reliability: 0.85,
              fileName,
            },
          ),
        );
      }
      add(
        ev(
          `Overall mean risk score: ${mean(vals)!.toFixed(2)} over ${vals.length} student-week records.`,
          { source: fileName, metrics: [{ name: "mean_risk_score", value: mean(vals)! }], reliability: 0.85, fileName },
        ),
      );
    }
  }

  if (csvIs(fileName, "attendance")) {
    const rateCol = columnMatch(rows, ["attendance_rate", "attendance", "rate"]) ?? "attendance_rate";
    const weekCol = columnMatch(rows, ["week", "period", "date"]) ?? "week";
    const vals = numericValues(rows, rateCol);
    if (vals.length > 0) {
      const m = mean(vals)!;
      add(
        ev(
          `Mean attendance rate: ${(m * 100).toFixed(1)}% across ${vals.length} student-week records (values 0..1 scale).`,
          {
            source: fileName,
            metrics: [{ name: "mean_attendance_rate", value: m }],
            reliability: 0.85,
            fileName,
          },
        ),
      );
      const weeks = new Map<string, number[]>();
      for (const r of firstRows(rows, rateCol, 10000)) {
        const wk = r[weekCol] ?? "?";
        const v = num(r[rateCol]);
        if (v !== null) {
          if (!weeks.has(wk)) weeks.set(wk, []);
          weeks.get(wk)!.push(v);
        }
      }
      const sortedWeeks = [...weeks.entries()].sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }));
      if (sortedWeeks.length >= 2) {
        const firstAvg = mean(sortedWeeks[0][1]) ?? 0;
        const lastAvg = mean(sortedWeeks[sortedWeeks.length - 1][1]) ?? 0;
        add(
          ev(
            `Attendance trend: ${(firstAvg * 100).toFixed(1)}% (${sortedWeeks[0][0]}) to ${(lastAvg * 100).toFixed(1)}% (${sortedWeeks[sortedWeeks.length - 1][0]}).`,
            {
              source: fileName,
              metrics: [{ name: "attendance_trend_change", value: lastAvg - firstAvg }],
              reliability: 0.8,
              fileName,
            },
          ),
        );
      }
    }
  }

  if (csvIs(fileName, "schedule") || csvIs(fileName, "class")) {
    const startCol = columnMatch(rows, ["start_time", "start"]) ?? "start_time";
    const endCol = columnMatch(rows, ["end_time", "end"]) ?? "end_time";
    const times = rows
      .map((r) => {
        const s = num(r[startCol]) ?? parseTime(r[startCol]);
        return s;
      })
      .filter((v): v is number => v !== null);
    if (times.length > 0) {
      const m = mean(times)!;
      add(
        ev(
          `Class schedule: ${rows.length} class periods recorded. Mean start time ${formatClock(m)} (numeric hour scale).`,
          {
            source: fileName,
            metrics: [{ name: "mean_class_start_hour", value: m }],
            reliability: 0.9,
            fileName,
          },
        ),
      );
    }
  }

  return items;
}

function parseTime(v: string): number | null {
  // "10:00" -> 10.0, "10:30" -> 10.5 ; also "10 AM"
  const m = v.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2] ?? "0");
  const suffix = (m[3] ?? "").toLowerCase();
  if (suffix === "pm" && h < 12) h += 12;
  if (suffix === "am" && h === 12) h = 0;
  return h + min / 60;
}

function formatClock(h: number): string {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

// ---- text evidence ----------------------------------------------------------

const CLAIM_HINT = /(\b(?:increased|decreased|rose|fell|dropped|raised|reduced|failed|missed|attended|attendance|rate|%|percent|reported|observed|survey|interview|notified|absent|absenteeism|dropout|engaged)\b)/i;

function textEvidence(rawText: string, fileName: string): Evidence[] {
  const items: Evidence[] = [];
  const sentences = rawText
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20);
  for (const s of sentences) {
    if (CLAIM_HINT.test(s)) {
      items.push(
        ev(`Reported statement: "${s.slice(0, 240)}"`, {
          source: fileName,
          sourceType: "DOCUMENT",
          claim: `Reported statement: "${s.slice(0, 240)}"`,
          reliability: 0.5,
          extractionConfidence: 0.55,
          fileName,
        }),
      );
    }
  }
  return items;
}

// ---- public API -------------------------------------------------------------

export interface ExtractResult {
  evidence: Evidence[];
  summaries: DataSourceSummary[];
  errors: string[];
}

export function extractEvidence(files: IngestedFile[]): ExtractResult {
  const evidence: Evidence[] = [];
  const summaries: DataSourceSummary[] = [];
  const errors: string[] = [];

  for (const file of files) {
    const rows = file.kind === "csv" ? file.csvRows : [];
    const types = inferColumnTypes(rows);
    const warnings: string[] = [];

    if (file.kind === "csv") {
      const missing = countMissing(rows);
      const dupes = countDuplicates(rows);
      if (rows.length === 0) warnings.push("No data rows.");
      if (missing > 0) warnings.push(`${missing} missing/empty values found.`);
      if (dupes > 0) warnings.push(`${dupes} duplicate records found.`);
      const emptyCols = Object.entries(types).filter(([, t]) => t === "empty").map(([c]) => c);
      if (emptyCols.length > 0) warnings.push(`Entirely empty columns: ${emptyCols.join(", ")}.`);

      const demoItems = extractDemoEvidence(rows, file.fileName);
      const genericItems = genericCsvEvidence(rows, file.fileName);
      evidence.push(...demoItems, ...genericItems);

      summaries.push({
        fileName: file.fileName,
        type: "dataset",
        sizeBytes: file.sizeBytes,
        rowCount: rows.length,
        columns: Object.keys(rows[0] ?? {}),
        qualityWarnings: warnings,
        missingValueCount: missing,
        duplicateCount: dupes,
        dateFields: detectDateFields(rows),
        possibleIdentifiers: detectIdentifiers(rows),
        evidenceCount: demoItems.length + genericItems.length,
      });
    } else if (file.kind === "json") {
      const count = file.jsonData.length;
      evidence.push(
        ev(
          `JSON dataset "${file.fileName}" parsed with ${count} top-level item(s). Detailed schema-level evidence is not derived for generic JSON in this prototype.`,
          {
            source: file.fileName,
            reliability: 0.6,
            extractionConfidence: 0.9,
            fileName: file.fileName,
          },
        ),
      );
      summaries.push({
        fileName: file.fileName,
        type: "dataset",
        sizeBytes: file.sizeBytes,
        rowCount: count,
        columns: [],
        qualityWarnings: ["Generic JSON: no schema-based evidence extraction."],
        missingValueCount: 0,
        duplicateCount: 0,
        dateFields: [],
        possibleIdentifiers: [],
        evidenceCount: 1,
      });
    } else if (file.kind === "pdf") {
      evidence.push(
        ev(
          `PDF document "${file.fileName}" uploaded. Text extraction is not available in this prototype; content was not parsed. Insufficient evidence for claims from this source.`,
          {
            source: file.fileName,
            sourceType: "DOCUMENT",
            reliability: 0.3,
            extractionConfidence: 0.1,
            fileName: file.fileName,
          },
        ),
      );
      summaries.push({
        fileName: file.fileName,
        type: "document",
        sizeBytes: file.sizeBytes,
        rowCount: 0,
        columns: [],
        qualityWarnings: ["PDF text extraction not supported in this prototype."],
        missingValueCount: 0,
        duplicateCount: 0,
        dateFields: [],
        possibleIdentifiers: [],
        evidenceCount: 1,
      });
    } else if (file.kind === "txt") {
      const items = textEvidence(file.rawText, file.fileName);
      evidence.push(...items);
      if (items.length === 0) {
        evidence.push(
          ev(
            `Text file "${file.fileName}" contained no statements that could be safely extracted as evidence. Insufficient evidence.`,
            {
              source: file.fileName,
              sourceType: "DOCUMENT",
              reliability: 0.4,
              extractionConfidence: 0.4,
              fileName: file.fileName,
            },
          ),
        );
      }
      summaries.push({
        fileName: file.fileName,
        type: "document",
        sizeBytes: file.sizeBytes,
        rowCount: 0,
        columns: [],
        qualityWarnings: items.length === 0 ? ["No evidence statements detected."] : [],
        missingValueCount: 0,
        duplicateCount: 0,
        dateFields: [],
        possibleIdentifiers: [],
        evidenceCount: items.length,
      });
    }
  }

  return { evidence, summaries, errors };
}
