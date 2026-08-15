// Validation and security guards for uploads and inputs.
// Everything here is deterministic and unit-tested.

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_UPLOAD_ROWS = 100_000;
export const SUPPORTED_EXTENSIONS = [".csv", ".tsv", ".json", ".txt", ".pdf"] as const;
export const ALLOWED_MIME_TYPES = [
  "text/csv",
  "text/plain",
  "application/json",
  "application/pdf",
  "application/octet-stream",
  "text/tab-separated-values",
];

export class ValidationError extends Error {}

export function extensionOf(fileName: string): string {
  const idx = fileName.lastIndexOf(".");
  return idx >= 0 ? fileName.slice(idx).toLowerCase() : "";
}

export function isSupportedExtension(fileName: string): boolean {
  return (SUPPORTED_EXTENSIONS as readonly string[]).includes(extensionOf(fileName));
}

/** Sanitize user-provided free text: strip control chars, trim, cap length. */
export function sanitizeText(input: string, maxLength = 5000): string {
  if (typeof input !== "string") return "";
  return input.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, maxLength);
}

export interface ValidationResult {
  ok: boolean;
  error?: string;
}

/** Validate a file upload before it touches the ingestion pipeline. */
export function validateUpload(fileName: string, sizeBytes: number, mimeType: string): ValidationResult {
  if (!fileName || typeof fileName !== "string") {
    return { ok: false, error: "No file name provided." };
  }
  if (!isSupportedExtension(fileName)) {
    return {
      ok: false,
      error: `Unsupported file type "${extensionOf(fileName)}". Supported: ${SUPPORTED_EXTENSIONS.join(", ")}`,
    };
  }
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    return { ok: false, error: "File appears to be empty." };
  }
  if (sizeBytes > MAX_FILE_SIZE_BYTES) {
    return {
      ok: false,
      error: `File is ${Math.round(sizeBytes / 1024 / 1024)} MB. Maximum allowed is ${MAX_FILE_SIZE_BYTES / 1024 / 1024} MB.`,
    };
  }
  if (mimeType && mimeType !== "application/octet-stream" && !ALLOWED_MIME_TYPES.includes(mimeType)) {
    return { ok: false, error: `Blocked file type (MIME): ${mimeType}` };
  }
  return { ok: true };
}

/** Reject JSON/CSV payloads that are absurdly deep or contain prototype pollution keys. */
export function sanitizeObjectKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeObjectKeys);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const safeKey = k.replace(/[^\w.-]/g, "_");
      if (safeKey === "__proto__" || safeKey === "constructor" || safeKey === "prototype") continue;
      out[safeKey] = sanitizeObjectKeys(v);
    }
    return out;
  }
  return value;
}

/** Very basic rate-limit window: max N requests per key per windowMs. In-memory. */
export class RateLimiter {
  private hits = new Map<string, number[]>();

  constructor(
    private max: number,
    private windowMs: number,
  ) {}

  check(key: string): boolean {
    const now = Date.now();
    const recent = (this.hits.get(key) ?? []).filter((t) => now - t < this.windowMs);
    if (recent.length >= this.max) {
      this.hits.set(key, recent);
      return false;
    }
    recent.push(now);
    this.hits.set(key, recent);
    return true;
  }
}
