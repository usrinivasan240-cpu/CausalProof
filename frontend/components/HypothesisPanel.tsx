"use client";

import { useState } from "react";

interface Hypothesis {
  id: string;
  cause: string;
  effect: string;
  failureCategory: string;
  supportingEvidence: string[];
  contradictingEvidence: string[];
  alternativeExplanations: string[];
  confidence: number;
  status: string;
  isLeading: boolean;
}

const STATUS_LABEL: Record<string, { color: string; label: string }> = {
  SUPPORTED: { color: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Supported by the available evidence" },
  POSSIBLE: { color: "bg-blue-50 text-blue-700 border-blue-200", label: "Possible explanation" },
  UNCERTAIN: { color: "bg-amber-50 text-amber-700 border-amber-200", label: "Insufficient evidence" },
  INSUFFICIENT_EVIDENCE: { color: "bg-slate-50 text-slate-600 border-slate-200", label: "Cannot establish causality from the available data" },
};

export default function HypothesisPanel({ hypotheses }: { hypotheses: Hypothesis[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (hypotheses.length === 0) {
    return <div className="card p-6 text-center text-slate-500">No hypotheses generated. Run the analysis first.</div>;
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Competing Failure Hypotheses</h3>
      <div className="grid gap-3">
        {hypotheses.map((h) => {
          const isOpen = expanded === h.id;
          const statusStyle = STATUS_LABEL[h.status] ?? STATUS_LABEL.UNCERTAIN;
          return (
            <div
              key={h.id}
              className={`card p-4 cursor-pointer transition-colors hover:bg-slate-50 ${h.isLeading ? "ring-2 ring-accent/30" : ""}`}
              onClick={() => setExpanded(isOpen ? null : h.id)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {h.isLeading && <span className="badge bg-accent text-white text-[10px]">Leading</span>}
                    <span className={`badge border text-[10px] ${statusStyle.color}`}>{statusStyle.label}</span>
                    <span className="badge bg-slate-100 text-slate-600 text-[10px]">{h.failureCategory}</span>
                  </div>
                  <p className="text-sm font-medium text-ink">{h.cause}</p>
                  <p className="text-xs text-slate-500 mt-1">{h.effect}</p>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-lg font-bold text-ink">{h.confidence}%</div>
                  <div className="text-[10px] text-slate-400">confidence</div>
                </div>
              </div>

              {isOpen && (
                <div className="mt-3 pt-3 border-t border-slate-100 space-y-3 text-xs">
                  <div>
                    <p className="font-medium text-slate-700 mb-1">Supporting Evidence ({h.supportingEvidence.length})</p>
                    {h.supportingEvidence.length === 0 ? (
                      <p className="text-slate-400 italic">No supporting evidence</p>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {h.supportingEvidence.map((id) => (
                          <span key={id} className="badge badge-observed text-[10px]">{id}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-slate-700 mb-1">Contradicting Evidence ({h.contradictingEvidence.length})</p>
                    {h.contradictingEvidence.length === 0 ? (
                      <p className="text-slate-400 italic">None found</p>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {h.contradictingEvidence.map((id) => (
                          <span key={id} className="badge bg-red-50 text-red-700 text-[10px]">{id}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  {h.alternativeExplanations.length > 0 && (
                    <div>
                      <p className="font-medium text-slate-700 mb-1">Alternative Explanations</p>
                      <ul className="list-disc list-inside text-slate-500 space-y-0.5">
                        {h.alternativeExplanations.map((a, i) => (
                          <li key={i}>{a}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
