"use client";

import { useEffect, useState, useCallback } from "react";
import CausalGraph from "@/components/CausalGraph";
import KpiCards from "@/components/KpiCards";
import EvidencePanel from "@/components/EvidencePanel";
import HypothesisPanel from "@/components/HypothesisPanel";
import CounterfactualLab from "@/components/CounterfactualLab";
import RecommendationsPanel from "@/components/RecommendationsPanel";
import SummaryPanel from "@/components/SummaryPanel";

interface Report {
  executiveSummary: string;
  intendedPathway: any[];
  observedPathway: any[];
  pathwayEdges: any[];
  divergences: any[];
  hypotheses: any[];
  evidence: any[];
  contradictingEvidence: string[];
  confidence: number;
  counterfactuals: any[];
  recommendations: any[];
  missingInformation: string[];
  limitations: string[];
  dataSources: any[];
  generatedAt: string;
  aiSource: string;
  aiNote?: string;
}

interface Investigation {
  id: string;
  name: string;
  domain: string;
  status: string;
  lastAnalysisAt?: string;
}

export default function DashboardPage() {
  const [investigation, setInvestigation] = useState<Investigation | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<"graph" | "evidence" | "hypotheses" | "counterfactual" | "recommendations">("graph");

  const loadData = useCallback(async () => {
    const invId = localStorage.getItem("cp_investigation_id");
    if (!invId) {
      setError("No investigation found. Please launch the demo first.");
      setLoading(false);
      return;
    }
    try {
      // Load investigation details
      const invRes = await fetch(`/api/investigations/${invId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("cp_token") ?? ""}` },
      });
      const invJson = await invRes.json();
      if (invRes.ok) {
        setInvestigation(invJson.investigation);
      }

      // Load full report from graph endpoint (returns everything)
      const graphRes = await fetch(`/api/graph/${invId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("cp_token") ?? ""}` },
      });
      const graphJson = await graphRes.json();
      if (!graphRes.ok) {
        setError(graphJson.error ?? "Failed to load analysis report.");
        setLoading(false);
        return;
      }

      setReport({
        executiveSummary: graphJson.executiveSummary ?? "",
        intendedPathway: graphJson.intended ?? [],
        observedPathway: graphJson.observed ?? [],
        pathwayEdges: graphJson.edges ?? [],
        divergences: graphJson.divergences ?? [],
        hypotheses: graphJson.hypotheses ?? [],
        evidence: graphJson.evidence ?? [],
        contradictingEvidence: graphJson.contradictingEvidence ?? [],
        confidence: graphJson.confidence ?? 0,
        counterfactuals: graphJson.counterfactuals ?? [],
        recommendations: graphJson.recommendations ?? [],
        missingInformation: graphJson.missingInformation ?? [],
        limitations: graphJson.limitations ?? [],
        dataSources: graphJson.dataSources ?? [],
        generatedAt: graphJson.generatedAt ?? new Date().toISOString(),
        aiSource: graphJson.aiSource ?? "deterministic",
      });
    } catch {
      setError("Network error — is the server running?");
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-slate-500">Loading analysis...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-red-600">{error}</p>
        <a href="/" className="btn-secondary">Back to Home</a>
      </main>
    );
  }

  const tabs = [
    { key: "graph" as const, label: "Causal Graph" },
    { key: "evidence" as const, label: "Evidence" },
    { key: "hypotheses" as const, label: "Hypotheses" },
    { key: "counterfactual" as const, label: "Counterfactual Lab" },
    { key: "recommendations" as const, label: "Redesign" },
  ];

  return (
    <main className="min-h-screen bg-paper">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="text-lg font-bold text-ink">CausalProof</a>
            {investigation && (
              <div className="hidden sm:block text-sm text-slate-500">
                <span className="font-medium text-ink">{investigation.name}</span>
                <span className="mx-2">·</span>
                <span>{investigation.domain}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 text-sm">
            {investigation?.status === "ANALYZED" && (
              <span className="badge badge-observed">Analyzed</span>
            )}
            {report?.generatedAt && (
              <span className="text-slate-400 hidden md:block">
                Last analysis: {new Date(report.generatedAt).toLocaleString()}
              </span>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Demo banner */}
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-md text-sm text-amber-800 flex items-center gap-2">
          <span className="font-semibold">Synthetic Demonstration Data</span>
          <span>— All numbers are prototype demonstration values, not real-world statistics.</span>
        </div>

        {/* KPIs */}
        <KpiCards
          divergences={report?.divergences ?? []}
          evidenceCount={report?.evidence?.length ?? 0}
          confidence={report?.confidence ?? 0}
          hypotheses={report?.hypotheses ?? []}
        />

        {/* Tabs */}
        <div className="flex gap-1 border-b border-slate-200 mb-6 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setSelectedTab(t.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                selectedTab === t.key
                  ? "border-accent text-accent"
                  : "border-transparent text-slate-500 hover:text-ink"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {selectedTab === "graph" && report && (
          <CausalGraph
            intended={report.intendedPathway}
            observed={report.observedPathway}
            edges={report.pathwayEdges}
            divergences={report.divergences}
          />
        )}
        {selectedTab === "evidence" && report && (
          <EvidencePanel
            evidence={report.evidence}
            contradictingIds={report.contradictingEvidence}
          />
        )}
        {selectedTab === "hypotheses" && report && (
          <HypothesisPanel hypotheses={report.hypotheses} />
        )}
        {selectedTab === "counterfactual" && report && (
          <CounterfactualLab
            counterfactuals={report.counterfactuals}
            investigationId={investigation?.id ?? ""}
          />
        )}
        {selectedTab === "recommendations" && report && (
          <RecommendationsPanel recommendations={report.recommendations} />
        )}

        {/* Summary */}
        {report && (
          <SummaryPanel
            summary={report.executiveSummary}
            missingInformation={report.missingInformation}
            limitations={report.limitations}
          />
        )}
      </div>
    </main>
  );
}
