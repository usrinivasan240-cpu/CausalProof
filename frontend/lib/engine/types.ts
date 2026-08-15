// Core domain types for CausalProof.
// The analysis engine is deterministic and evidence-driven: it never
// fabricates evidence and clearly separates observed facts from inference.

export type NodeKind =
  | "intervention"
  | "condition"
  | "event"
  | "mechanism"
  | "outcome"
  | "external_factor"
  | "failure_point";

export type NodeStatus = "EXPECTED" | "OBSERVED" | "FAILED" | "UNCERTAIN" | "EXTERNAL";

export type EdgeRelation = "expected" | "observed" | "possible" | "contradictory";

export type EvidenceSourceType = "DOCUMENT" | "DATASET" | "EVENT" | "USER_INPUT";

export interface EvidenceMetric {
  name: string;
  value: number;
  unit?: string;
}

export interface Evidence {
  id: string;
  source: string;
  sourceType: EvidenceSourceType;
  claim: string;
  timestamp?: string;
  entities: string[];
  metrics: EvidenceMetric[];
  /** 0..1 — source reliability */
  reliability: number;
  /** 0..1 — how confidently this was extracted / asserted */
  extractionConfidence: number;
  fileName?: string;
  rowIndex?: number;
}

export interface PathwayNode {
  id: string;
  label: string;
  kind: NodeKind;
  description?: string;
  expectedMetric?: string;
  /** Expected numeric value or a readable bound e.g. ">= 0.8" */
  expectedValue?: string;
  /** Evidence ids supporting this node's observed status */
  evidence?: string[];
  status: NodeStatus;
  /** For failure nodes: which divergence caused it */
  divergenceId?: string;
  observedValue?: string;
}

export interface PathwayEdge {
  id: string;
  source: string;
  target: string;
  relation: EdgeRelation;
  evidence?: string[];
  confidence?: number;
  /** Human-readable reason shown when selected */
  reason?: string;
}

export interface Investigation {
  id: string;
  name: string;
  domain: string;
  problem: string;
  intervention: string;
  expectedOutcome: string;
  targetMetric: string;
  targetValue: number;
  periodStart: string;
  periodEnd: string;
  status: "DRAFT" | "ANALYZED" | "ERROR";
  createdAt: string;
  lastAnalysisAt?: string;
  isDemo?: boolean;
}

export type DivergenceType =
  | "missing_step"
  | "delayed_step"
  | "unexpected_transition"
  | "failed_condition"
  | "unexpected_event"
  | "contradictory_evidence"
  | "metric_deviation"
  | "external_factor";

export interface Divergence {
  id: string;
  type: DivergenceType;
  expected: string;
  observed: string;
  difference: string;
  evidenceIds: string[];
  /** 0..100 */
  confidence: number;
}

export type FailureCategory =
  | "implementation"
  | "mechanism"
  | "context"
  | "design"
  | "external"
  | "measurement";

export type HypothesisStatus =
  | "SUPPORTED"
  | "POSSIBLE"
  | "UNCERTAIN"
  | "INSUFFICIENT_EVIDENCE";

export interface Hypothesis {
  id: string;
  cause: string;
  effect: string;
  failureCategory: FailureCategory;
  supportingEvidence: string[];
  contradictingEvidence: string[];
  alternativeExplanations: string[];
  /** 0..100 */
  confidence: number;
  status: HypothesisStatus;
  isLeading: boolean;
}

export interface CounterfactualResult {
  id: string;
  metric: string;
  observed: number;
  counterfactual: number;
  difference: number;
  differencePct: number;
  assumptions: string[];
  confidence: number;
  /** Always true for counterfactual outputs — simulation, not fact */
  isSimulation: true;
}

export interface Recommendation {
  id: string;
  title: string;
  intervention: string;
  expectedMechanism: string;
  supportingEvidence: string[];
  assumptions: string[];
  expectedBenefit: string;
  impact: "High" | "Medium" | "Low";
  complexity: "Low" | "Medium" | "High";
  unintendedConsequences: string[];
  confidence: number;
}

export interface DataSourceSummary {
  fileName: string;
  type: string;
  sizeBytes: number;
  rowCount: number;
  columns: string[];
  qualityWarnings: string[];
  missingValueCount: number;
  duplicateCount: number;
  dateFields: string[];
  possibleIdentifiers: string[];
  evidenceCount: number;
}

export interface AnalysisReport {
  investigationId: string;
  generatedAt: string;
  aiSource: "deterministic" | "llm-augmented";
  aiNote?: string;
  executiveSummary: string;
  intendedPathway: PathwayNode[];
  observedPathway: PathwayNode[];
  pathwayEdges: PathwayEdge[];
  divergences: Divergence[];
  hypotheses: Hypothesis[];
  evidence: Evidence[];
  contradictingEvidence: string[];
  confidence: number;
  counterfactuals: CounterfactualResult[];
  recommendations: Recommendation[];
  missingInformation: string[];
  limitations: string[];
  dataSources: DataSourceSummary[];
}

/** Config describing a domain. Keeps the engine domain-agnostic. */
export interface DomainConfig {
  domain: string;
  entities: string[];
  metrics: string[];
  interventionTypes: string[];
  failureCategories: FailureCategory[];
  dataSources: string[];
}

export interface UploadedFileSummary {
  id: string;
  investigationId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  contentType: string;
  uploadedAt: string;
  summary: DataSourceSummary;
  evidenceIds: string[];
}

export interface EvidenceFileSpec {
  path: string;
  kind: "csv" | "json" | "txt" | "pdf";
}
