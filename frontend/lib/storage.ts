// Simple JSON-file persistence used by the API routes and tests.
// Keeps the prototype dependency-free (no database server required).
// Data lives under <repo>/data/store by default.

import { mkdirSync, existsSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import {
  AnalysisReport,
  Evidence,
  Investigation,
  PathwayNode,
  UploadedFileSummary,
} from "@/lib/engine/types";

export function repoRoot(): string {
  if (process.env.CAUSALPROOF_ROOT) return process.env.CAUSALPROOF_ROOT;
  let dir = process.cwd();
  for (let i = 0; i < 5; i++) {
    if (existsSync(join(dir, "frontend")) && existsSync(join(dir, "data"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return dirname(process.cwd());
}

export function dataDir(): string {
  const root = repoRoot();
  return join(root, "data");
}

export function storeDir(): string {
  const d = join(dataDir(), "store");
  mkdirSync(d, { recursive: true });
  return d;
}

export function demoDir(): string {
  const d = join(dataDir(), "demo");
  mkdirSync(d, { recursive: true });
  return d;
}

function readJson<T>(file: string, fallback: T): T {
  try {
    if (!existsSync(file)) return fallback;
    return JSON.parse(readFileSync(file, "utf-8")) as T;
  } catch {
    return fallback;
  }
}

function writeJson(file: string, value: unknown): void {
  const tmp = `${file}.tmp`;
  writeFileSync(tmp, JSON.stringify(value, null, 2), "utf-8");
  writeFileSync(file, JSON.stringify(value, null, 2), "utf-8");
}

// ---- investigations ----

const investigationsFile = () => join(storeDir(), "investigations.json");

export function listInvestigations(): Investigation[] {
  const map = readJson<Record<string, Investigation>>(investigationsFile(), {});
  return Object.values(map).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getInvestigation(id: string): Investigation | null {
  return readJson<Record<string, Investigation>>(investigationsFile(), {})[id] ?? null;
}

export function saveInvestigation(inv: Investigation): void {
  const map = readJson<Record<string, Investigation>>(investigationsFile(), {});
  map[inv.id] = inv;
  writeJson(investigationsFile(), map);
}

// ---- per-investigation collections ----

const fileFor = (kind: string, id: string) => join(storeDir(), `${kind}_${id}.json`);

export function saveIntended(id: string, nodes: PathwayNode[]): void {
  writeJson(fileFor("intended", id), nodes);
}
export function getIntended(id: string): PathwayNode[] {
  return readJson<PathwayNode[]>(fileFor("intended", id), []);
}

export function saveEvidence(id: string, items: Evidence[]): void {
  writeJson(fileFor("evidence", id), items);
}
export function getEvidence(id: string): Evidence[] {
  return readJson<Evidence[]>(fileFor("evidence", id), []);
}

export function saveUploads(id: string, items: UploadedFileSummary[]): void {
  writeJson(fileFor("uploads", id), items);
}
export function getUploads(id: string): UploadedFileSummary[] {
  return readJson<UploadedFileSummary[]>(fileFor("uploads", id), []);
}

export function saveReport(id: string, report: AnalysisReport): void {
  writeJson(fileFor("report", id), report);
}
export function getReport(id: string): AnalysisReport | null {
  return readJson<AnalysisReport | null>(fileFor("report", id), null);
}

export function deleteInvestigation(id: string): boolean {
  const file = investigationsFile();
  const map = readJson<Record<string, Investigation>>(file, {});
  if (!map[id]) return false;
  delete map[id];
  writeJson(file, map);
  for (const kind of ["intended", "evidence", "uploads", "report"]) {
    try {
      const f = fileFor(kind, id);
      if (existsSync(f)) writeFileSync(f, "null", "utf-8");
    } catch {
      /* ignore */
    }
  }
  return true;
}
