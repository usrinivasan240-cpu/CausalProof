import { describe, it, expect } from "vitest";
import {
  validateUpload,
  sanitizeText,
  sanitizeObjectKeys,
  isSupportedExtension,
  RateLimiter,
} from "../lib/engine/validation";

describe("validateUpload", () => {
  it("accepts valid CSV", () => {
    const result = validateUpload("data.csv", 1000, "text/csv");
    expect(result.ok).toBe(true);
  });

  it("rejects unsupported extension", () => {
    const result = validateUpload("file.exe", 1000, "application/octet-stream");
    expect(result.ok).toBe(false);
    expect(result.error).toContain("Unsupported");
  });

  it("rejects empty file", () => {
    const result = validateUpload("data.csv", 0, "text/csv");
    expect(result.ok).toBe(false);
    expect(result.error).toContain("empty");
  });

  it("rejects oversized file", () => {
    const result = validateUpload("data.csv", 10 * 1024 * 1024, "text/csv");
    expect(result.ok).toBe(false);
    expect(result.error).toContain("MB");
  });

  it("rejects blocked MIME type", () => {
    const result = validateUpload("data.csv", 1000, "application/javascript");
    expect(result.ok).toBe(false);
  });
});

describe("sanitizeText", () => {
  it("replaces control characters", () => {
    expect(sanitizeText("hello\x00world")).toBe("hello world");
  });

  it("trims and caps length", () => {
    expect(sanitizeText("  hello  ", 5)).toBe("hello");
  });

  it("returns empty for non-string", () => {
    expect(sanitizeText(null as any)).toBe("");
  });
});

describe("sanitizeObjectKeys", () => {
  it("removes prototype pollution keys", () => {
    const input = { __proto__: { polluted: true }, normal: "ok" };
    const result = sanitizeObjectKeys(input) as Record<string, unknown>;
    expect(result).not.toHaveProperty("__proto__");
    expect(result.normal).toBe("ok");
  });

  it("sanitizes special characters in keys", () => {
    const input = { "key with spaces": 1 };
    const result = sanitizeObjectKeys(input) as Record<string, unknown>;
    expect(result).toHaveProperty("key_with_spaces");
    expect(result.key_with_spaces).toBe(1);
  });
});

describe("isSupportedExtension", () => {
  it("accepts .csv", () => expect(isSupportedExtension("data.csv")).toBe(true));
  it("accepts .json", () => expect(isSupportedExtension("data.json")).toBe(true));
  it("accepts .txt", () => expect(isSupportedExtension("notes.txt")).toBe(true));
  it("rejects .exe", () => expect(isSupportedExtension("file.exe")).toBe(false));
});

describe("RateLimiter", () => {
  it("allows requests within limit", () => {
    const limiter = new RateLimiter(3, 1000);
    expect(limiter.check("user1")).toBe(true);
    expect(limiter.check("user1")).toBe(true);
    expect(limiter.check("user1")).toBe(true);
  });

  it("blocks requests over limit", () => {
    const limiter = new RateLimiter(2, 1000);
    limiter.check("user1");
    limiter.check("user1");
    expect(limiter.check("user1")).toBe(false);
  });
});
