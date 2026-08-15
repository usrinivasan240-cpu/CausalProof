// Small, dependency-free CSV parser (RFC-4180 style) plus generic data file parsing.
// Used by the ingestion layer and tests.

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;

  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };

  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += ch;
      i += 1;
      continue;
    }
    if (ch === '"' && field.length === 0) {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (ch === ",") {
      pushField();
      i += 1;
      continue;
    }
    if (ch === "\n") {
      pushRow();
      i += 1;
      continue;
    }
    if (ch === "\r") {
      i += 1;
      continue;
    }
    field += ch;
    i += 1;
  }
  if (field.length > 0 || row.length > 0) pushRow();

  // Drop trailing fully-empty rows
  while (rows.length > 0 && rows[rows.length - 1].every((c) => c.trim() === "")) {
    rows.pop();
  }
  return rows;
}

/** Parse CSV text into an array of objects using the first row as headers. */
export function parseCsvToObjects(text: string): Record<string, string>[] {
  const rows = parseCsv(text);
  if (rows.length < 1) return [];
  const header = rows[0].map((h) => h.trim());
  const seen = new Map<string, number>();
  const uniqueHeader = header.map((h, idx) => {
    const count = seen.get(h) ?? 0;
    seen.set(h, count + 1);
    return count === 0 ? h : `${h}_${count + 1}`;
  });
  const out: Record<string, string>[] = [];
  for (let r = 1; r < rows.length; r++) {
    const row: Record<string, string> = {};
    rows[r].forEach((value, idx) => {
      if (idx < uniqueHeader.length) row[uniqueHeader[idx]] = value.trim();
    });
    out.push(row);
  }
  return out;
}

/** Guess the delimiter for a delimiter-separated file (comma, tab, pipe, semicolon). */
export function detectDelimiter(text: string): string {
  const firstLines = text.slice(0, 5000).split(/\r?\n/).slice(0, 5);
  const candidates = [",", "\t", "|", ";"];
  let best = ",";
  let bestCount = -1;
  for (const cand of candidates) {
    let count = 0;
    for (const line of firstLines) {
      count += line.split(cand).length - 1;
    }
    if (count > bestCount) {
      bestCount = count;
      best = cand;
    }
  }
  return bestCount <= 0 ? "," : best;
}

function numParse(v: string): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function inferColumnTypes(rows: Record<string, string>[]): Record<string, string> {
  const types: Record<string, string> = {};
  if (rows.length === 0) return types;
  for (const key of Object.keys(rows[0])) {
    let numeric = 0;
    let nonEmpty = 0;
    const values = rows.map((r) => r[key]);
    for (const v of values) {
      if (v === "") continue;
      nonEmpty++;
      if (numParse(v) !== null) numeric++;
    }
    if (nonEmpty > 0 && numeric === nonEmpty) types[key] = "number";
    else if (nonEmpty === 0) types[key] = "empty";
    else types[key] = "string";
  }
  return types;
}

export function countMissing(rows: Record<string, string>[]): number {
  let missing = 0;
  for (const r of rows) for (const v of Object.values(r)) if (v === "") missing++;
  return missing;
}

const DATE_PATTERN = /(date|time|dt|day|month|year|ts|when|on)/i;

export function detectDateFields(rows: Record<string, string>[]): string[] {
  if (rows.length === 0) return [];
  const keys = Object.keys(rows[0]);
  return keys.filter((k) => {
    const hasName = DATE_PATTERN.test(k);
    const sample = rows.slice(0, 20).map((r) => r[k]).filter((v) => v !== "");
    const hasDateLike = sample.some((v) => !Number.isNaN(Date.parse(v)));
    return hasName || hasDateLike;
  });
}

export function detectIdentifiers(rows: Record<string, string>[]): string[] {
  if (rows.length === 0) return [];
  const keys = Object.keys(rows[0]);
  const total = rows.length;
  return keys.filter((k) => {
    const values = new Set(rows.map((r) => r[k]).filter((v) => v !== ""));
    return (
      values.size === total &&
      total > 1 &&
      /(id|_id|code|student|key|uuid|email)/i.test(k)
    );
  });
}

export function countDuplicates(rows: Record<string, string>[]): number {
  const seen = new Set<string>();
  let dupes = 0;
  for (const r of rows) {
    const key = JSON.stringify(Object.values(r));
    if (seen.has(key)) dupes++;
    else seen.add(key);
  }
  return dupes;
}

export interface ParsedDataFile {
  kind: "csv" | "json" | "txt";
  csvRows: Record<string, string>[];
  jsonData: unknown[];
  rawText: string;
}

export function parseDataFile(text: string, fileName: string): ParsedDataFile {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".json")) {
    let jsonData: unknown[];
    try {
      const parsed = JSON.parse(text);
      jsonData = Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      throw new Error("Invalid JSON file: could not parse content.");
    }
    return { kind: "json", csvRows: [], jsonData, rawText: text };
  }
  if (lower.endsWith(".csv") || lower.endsWith(".tsv")) {
    const delim = detectDelimiter(text);
    const normalized = delim !== "," ? text.split(delim).join(",") : text;
    const csvRows = parseCsvToObjects(normalized);
    if (csvRows.length === 0) throw new Error("CSV file has no data rows.");
    return { kind: "csv", csvRows, jsonData: [], rawText: text };
  }
  // txt (or any other text): treat as plain text
  return { kind: "txt", csvRows: [], jsonData: [], rawText: text };
}
