import { describe, it, expect } from "vitest";
import {
  parseCsv,
  parseCsvToObjects,
  detectDelimiter,
  inferColumnTypes,
  countMissing,
  countDuplicates,
  detectDateFields,
  detectIdentifiers,
} from "../lib/engine/csv";

describe("parseCsv", () => {
  it("parses simple CSV", () => {
    const result = parseCsv("a,b,c\n1,2,3\n4,5,6");
    expect(result).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
      ["4", "5", "6"],
    ]);
  });

  it("handles quoted fields with commas", () => {
    const result = parseCsv('a,b\n"hello, world",2\n3,4');
    expect(result[1][0]).toBe("hello, world");
  });

  it("handles escaped quotes inside quoted fields", () => {
    const result = parseCsv('a,b\n"he said ""hi""",2\n3,4');
    expect(result[1][0]).toBe('he said "hi"');
  });

  it("handles empty input", () => {
    expect(parseCsv("")).toEqual([]);
  });

  it("handles trailing newlines", () => {
    const result = parseCsv("a,b\n1,2\n\n");
    expect(result.length).toBe(2);
  });
});

describe("parseCsvToObjects", () => {
  it("uses first row as headers", () => {
    const result = parseCsvToObjects("name,age\nAlice,30\nBob,25");
    expect(result).toEqual([
      { name: "Alice", age: "30" },
      { name: "Bob", age: "25" },
    ]);
  });

  it("deduplicates headers", () => {
    const result = parseCsvToObjects("a,b,a\n1,2,3");
    expect(Object.keys(result[0])).toEqual(["a", "b", "a_2"]);
  });
});

describe("detectDelimiter", () => {
  it("detects comma", () => {
    expect(detectDelimiter("a,b,c\n1,2,3")).toBe(",");
  });

  it("detects tab", () => {
    expect(detectDelimiter("a\tb\tc\n1\t2\t3")).toBe("\t");
  });

  it("defaults to comma for empty", () => {
    expect(detectDelimiter("")).toBe(",");
  });
});

describe("inferColumnTypes", () => {
  it("detects numeric vs string columns", () => {
    const rows = [
      { id: "1", name: "Alice", score: "95" },
      { id: "2", name: "Bob", score: "87" },
    ];
    const types = inferColumnTypes(rows);
    expect(types.id).toBe("number");
    expect(types.name).toBe("string");
    expect(types.score).toBe("number");
  });
});

describe("countMissing", () => {
  it("counts empty cells", () => {
    const rows = [{ a: "1", b: "" }, { a: "", b: "" }];
    expect(countMissing(rows)).toBe(3);
  });
});

describe("countDuplicates", () => {
  it("counts duplicate rows", () => {
    const rows = [
      { a: "1", b: "2" },
      { a: "1", b: "2" },
      { a: "3", b: "4" },
    ];
    expect(countDuplicates(rows)).toBe(1);
  });
});

describe("detectDateFields", () => {
  it("detects date columns by name", () => {
    const rows = [{ date: "2026-01-01", score: "5" }];
    const fields = detectDateFields(rows);
    expect(fields).toContain("date");
  });
});

describe("detectIdentifiers", () => {
  it("detects id columns with unique values", () => {
    const rows = [
      { student_id: "S1", score: "90" },
      { student_id: "S2", score: "85" },
    ];
    expect(detectIdentifiers(rows)).toContain("student_id");
  });
});
