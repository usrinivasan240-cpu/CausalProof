// Analysis Pipeline — orchestrates the full CausalProof workflow:
// facts -> observed pathway -> divergences -> hypotheses ->
// counterfactuals -> recommendations -> report.

import {
  AnalysisReport,
  Evidence,
  Investigation,
  PathwayNode,
  DataSourceSummary,
} from "./types";
import { extractFacts, buildObservedPathway } from "./observedPathway";
import { detectDivergences } from "./divergence";
import { generateHypotheses } from "./hypotheses";
import { runCounterfactuals } from "./counterfactual";
import { generateRecommendations } from "./recommendations";
import { clamp100 } from "./confidence";

export interface PipelineInput {
  investigation: Investigation;
  intendedNodes: PathwayNode[];
  evidence: Evidence[];
  dataSources: DataSourceSummary[];
  aiSource?: "deterministic" | "llm-augmented";
  aiNote?: string;
}

function buildExecutiveSummary(
  input: PipelineInput,
  facts: ReturnType<typeof extractFacts>,
  divergences: ReturnType<typeof detectDivergences>,
  hypotheses: ReturnType<typeof generateHypotheses>,
): string {
  const { investigation, evidence } = input;
  const target = investigation.targetValue;
  const factV = (m: string): number | null => facts.get(m)?.value ?? null;

  const riskChange = factV("risk_score_change_pct");
  const attendanceRate = factV("attendance_rate_pct");
  const conflictRate = factV("missed_with_class_conflict_pct");
  const outcomeDeviation =
    riskChange !== null ? Math.round((riskChange - target) * 10) / 10 : null;

  const leading = hypotheses.find((h) => h.isLeading);
  const calibrated = leading
    ? `${leading.cause} (${leading.status.toLowerCase().replace("_", " ")}, ${leading.confidence}% confidence)`
    : "no leading hypothesis could be established from the available data";

  const parts: string[] = [];
  parts.push(
    `The "${investigation.intervention}" intervention in ${investigation.domain} targeted a ${target} ${investigation.targetMetric} over the investigation period.`,
  );
  if (riskChange !== null) {
    parts.push(
      `The observed mean risk-score change was ${riskChange.toFixed(1)}%, ` +
        `${outcomeDeviation !== null && outcomeDeviation <= 0 ? "short of" : "above"} the ${target}% target by ${Math.abs(outcomeDeviation ?? 0).toFixed(1)} percentage points.`,
    );
  }
  if (attendanceRate !== null && conflictRate !== null) {
    parts.push(
      `Counselling attendance reached ${attendanceRate.toFixed(0)}%, and ${conflictRate.toFixed(0)}% of missed sessions overlapped with scheduled classes.`,
    );
  }
  if (leading) {
    parts.push(`Leading failure hypothesis (${leading.failureCategory}): ${calibrated}.`);
  } else {
    parts.push(`No single failure hypothesis can be confirmed from the available evidence.`);
  }
  parts.push(
    `${divergences.length} divergence point(s) and ${evidence.length} evidence item(s) were identified.`,
  );
  return parts.join(" ");
}

function missingInformation(facts: ReturnType<typeof extractFacts>, observed: PathwayNode[]): string[] {
  const missing: string[] = [];
  const seen = new Set<string>();
  const push = (s: string) => {
    if (!seen.has(s)) {
      seen.add(s);
      missing.push(s);
    }
  };

  if (!facts.has("attendance_rate_pct") && !facts.has("sessions_attended")) {
    push("Counselling attendance data");
  }
  if (!facts.has("risk_score_change_pct")) {
    push("Risk-score trend data over the investigation period");
  }
  const engagementNode = observed.find((n) => /engag/i.test(n.label));
  if (engagementNode && engagementNode.status === "UNCERTAIN") {
    push("A direct measure of student engagement");
  }
  if (!facts.has("open_rate_pct") && !facts.has("delivery_rate_pct")) {
    push("Notification delivery / open metrics");
  }
  push("Student-level reasons for counselling non-attendance");
  push("Data on external events that may have affected the outcome");
  push("Temporal (time-stamped) detail linking each intervention event to outcomes");
  return missing;
}

function limitations(input: PipelineInput): string[] {
  const lims = [
    "Causal conclusions cannot be proven from observational data alone; hypotheses here are the most plausible given available evidence.",
    "The analysis engine is rule-based and deterministic; it does not learn from data.",
    "Simulation results (counterfactuals) are estimates under stated assumptions, not observed facts.",
    "Records may be incomplete, self-reported, or affected by measurement bias; reliability scores reflect this.",
    "Statistical uncertainty intervals are not computed in this prototype.",
  ];
  if (input.aiSource === "llm-augmented") {
    lims.push("LLM augmentation may introduce errors; all AI claims are cross-checked against evidence.");
  }
  return lims;
}

export function runAnalysis(input: PipelineInput): AnalysisReport {
  const { investigation, intendedNodes, evidence, dataSources } = input;

  const facts = extractFacts(evidence);
  const observedResult = buildObservedPathway(intendedNodes, evidence, facts);
  const divergences = detectDivergences({
    intended: intendedNodes,
    observed: observedResult.nodes,
    unexpected: observedResult.unexpectedNodes,
    edges: observedResult.edges,
    evidence,
    facts,
  });
  const hypotheses = generateHypotheses({ evidence, facts, divergences });
  const counterfactuals = runCounterfactuals({ facts });
  const recommendations = generateRecommendations({ facts });

  const allNodes = [...observedResult.nodes, ...observedResult.unexpectedNodes];
  const summary = buildExecutiveSummary(input, facts, divergences, hypotheses);

  const confidence = clamp100(
    hypotheses.reduce((acc, h) => acc + h.confidence, 0) / Math.max(1, hypotheses.length),
  );

  const contradictingEvidence = evidence
    .filter((e) => /conflict|low|missed|insufficient|did not|no evidence/i.test(e.claim))
    .slice(0, 8)
    .map((e) => e.id);

  return {
    investigationId: investigation.id,
    generatedAt: new Date().toISOString(),
    aiSource: input.aiSource ?? "deterministic",
    aiNote: input.aiNote,
    executiveSummary: summary,
    intendedPathway: intendedNodes,
    observedPathway: allNodes,
    pathwayEdges: observedResult.edges,
    divergences,
    hypotheses,
    evidence,
    contradictingEvidence: [...new Set(contradictingEvidence)],
    confidence,
    counterfactuals,
    recommendations,
    missingInformation: missingInformation(facts, observedResult.nodes),
    limitations: limitations(input),
    dataSources,
  };
}
