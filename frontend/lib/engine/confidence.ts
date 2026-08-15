// Calibrated confidence computation.
//
// Confidence is computed from evidence weights and explicit penalties rather
// than guessed. It is never a substitute for epistemic honesty: hypotheses
// with thin evidence are assigned "INSUFFICIENT_EVIDENCE" status regardless
// of the numeric score.

/** Weighted confidence from a set of evidence ids (0..1 reliabilities). */
export function evidenceWeight(
  evidenceIds: string[],
  reliabilityOf: (id: string) => number | undefined,
): { weight: number; count: number } {
  const rels = evidenceIds
    .map((id) => reliabilityOf(id))
    .filter((r): r is number => r !== undefined);
  if (rels.length === 0) return { weight: 0, count: 0 };
  // Weighted sum bounded, decays sub-linearly with more items.
  const sum = rels.reduce((a, b) => a + b, 0);
  const weight = 1 - Math.exp(-sum);
  return { weight, count: rels.length };
}

/** Clamp 0..100. */
export function clamp100(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export interface ConfidenceInput {
  supporting: number; // 0..1 weighted support
  contradicting: number; // 0..1 weighted contradiction
  coverage: number; // 0..1 how much of the claim the evidence addresses
}

/**
 * Combine support, contradiction and coverage into a single calibrated 0..100 score.
 * Contradiction subtracts relative to how strong it is.
 */
export function combinedConfidence({ supporting, contradicting, coverage }: ConfidenceInput): number {
  const net = supporting * coverage - contradicting * 0.8;
  return clamp100(net * 100);
}

/** Map a numeric confidence to a calibrated hypothesis status. */
export function statusFromConfidence(
  confidence: number,
  evidenceCount: number,
): "SUPPORTED" | "POSSIBLE" | "UNCERTAIN" | "INSUFFICIENT_EVIDENCE" {
  if (evidenceCount === 0) return "INSUFFICIENT_EVIDENCE";
  if (confidence >= 65 && evidenceCount >= 2) return "SUPPORTED";
  if (confidence >= 40) return "POSSIBLE";
  if (evidenceCount === 1) return "UNCERTAIN";
  return "UNCERTAIN";
}
