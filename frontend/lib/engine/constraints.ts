// Constraint parsing for expected values, e.g. ">= 80", "<= -20", ">= 0.9".
export type ConstraintOp = ">=" | "<=" | ">" | "<" | "==";

export interface Constraint {
  op: ConstraintOp;
  value: number;
}

const OP_RE = /^\s*(>=|<=|>|<|==)\s*(-?\d+(?:\.\d+)?)%?\s*$/;
const PLAIN_RE = /^\s*(-?\d+(?:\.\d+)?)%?\s*$/;

export function parseConstraint(text: string | undefined): Constraint | null {
  if (!text) return null;
  const trimmed = text.trim();
  const opMatch = trimmed.match(OP_RE);
  if (opMatch) return { op: opMatch[1] as ConstraintOp, value: Number(opMatch[2]) };
  const plain = trimmed.match(PLAIN_RE);
  if (plain) return { op: ">=", value: Number(plain[1]) };
  return null;
}

export function checkConstraint(constraint: Constraint, value: number): boolean {
  switch (constraint.op) {
    case ">=":
      return value >= constraint.value;
    case "<=":
      return value <= constraint.value;
    case ">":
      return value > constraint.value;
    case "<":
      return value < constraint.value;
    case "==":
      return Math.abs(value - constraint.value) < 0.001;
    default:
      return true;
  }
}

export function formatConstraint(text: string | undefined): string {
  if (!text) return "";
  const c = parseConstraint(text);
  if (!c) return text.trim();
  return `${c.op} ${c.value}`;
}
