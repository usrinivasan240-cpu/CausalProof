import { describe, it, expect } from "vitest";
import { parseConstraint, checkConstraint } from "../lib/engine/constraints";

describe("Constraints", () => {
  it("parses >= constraint", () => {
    expect(parseConstraint(">= 80")).toEqual({ op: ">=", value: 80 });
  });

  it("parses <= constraint", () => {
    expect(parseConstraint("<= -20")).toEqual({ op: "<=", value: -20 });
  });

  it("parses plain number as >=", () => {
    expect(parseConstraint("50")).toEqual({ op: ">=", value: 50 });
  });

  it("parses percentage", () => {
    expect(parseConstraint(">= 80%")).toEqual({ op: ">=", value: 80 });
  });

  it("returns null for invalid", () => {
    expect(parseConstraint(undefined)).toBeNull();
    expect(parseConstraint("invalid")).toBeNull();
  });

  it("checks >= constraint", () => {
    expect(checkConstraint({ op: ">=", value: 80 }, 85)).toBe(true);
    expect(checkConstraint({ op: ">=", value: 80 }, 75)).toBe(false);
  });

  it("checks <= constraint", () => {
    expect(checkConstraint({ op: "<=", value: -20 }, -25)).toBe(true);
    expect(checkConstraint({ op: "<=", value: -20 }, -15)).toBe(false);
  });

  it("checks < constraint", () => {
    expect(checkConstraint({ op: "<", value: 0.9 }, 0.85)).toBe(true);
    expect(checkConstraint({ op: "<", value: 0.9 }, 0.95)).toBe(false);
  });

  it("checks == constraint with tolerance", () => {
    expect(checkConstraint({ op: "==", value: 80 }, 80.0000001)).toBe(true);
    expect(checkConstraint({ op: "==", value: 80 }, 81)).toBe(false);
  });
});
