"use client";

import { useState } from "react";

interface Evidence {
  id: string;
  source: string;
  sourceType: string;
  claim: string;
  metrics?: { name: string; value: number }[];
  reliability: number;
  extractionConfidence: number;
  fileName?: string;
  timestamp?: string;
}

interface EvidencePanelProps {
  evidence: Evidence[];
  contradictingIds: string[];
}

export default function EvidencePanel({ evidence, contradictingIds }: EvidencePanelProps) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "contradicting">("all");

  const items = filter === "contradicting"
    ? evidence.filter((e) => contradictingIds.includes(e.id))
    : evidence;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <h3 className="font-semibold">Evidence Proof Cards</h3>
        <div className="flex gap-1 ml-auto">
          {(["all", "contradicting"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`badge cursor-pointer ${filter === f ? "bg-accent text-white" : "bg-slate-100 text-slate-600"}`}
            >
              {f === "contradicting" ? "Contradicting" : `All (${evidence.length})`}
            </button>
          ))}
        </div>
      </div>

      {items.length === 0 && (
        <div className="card p-6 text-center text-slate-500">No {filter} evidence items.</div>
      )}

      <div className="grid gap-3">
        {items.map((ev) => {
          const isOpen = expanded === ev.id;
          const isContradicting = contradictingIds.includes(ev.id);
          return (
            <div
              key={ev.id}
              className={`card p-4 cursor-pointer transition-colors hover:bg-slate-50 ${isContradicting ? "border-l-4 border-l-red-400" : ""}`}
              onClick={() => setExpanded(isOpen ? null : ev.id)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-slate-400">{ev.id}</span>
                    <span className="badge badge-observed text-[10px]">{ev.sourceType}</span>
                    {isContradicting && <span className="badge bg-red-50 text-red-700 text-[10px]">contradicting</span>}
                  </div>
                  <p className="text-sm text-ink leading-relaxed">{ev.claim}</p>
                  {ev.metrics && ev.metrics.length > 0 && (
                    <div className="flex gap-3 mt-2">
                      {ev.metrics.slice(0, 4).map((m) => (
                        <span key={m.name} className="text-xs text-slate-500">
                          <span className="font-medium">{m.name}:</span>{" "}
                          {typeof m.value === "number" ? m.value.toFixed(1) : m.value}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-right text-xs text-slate-400 shrink-0">
                  <div>Reliability: {Math.round(ev.reliability * 100)}%</div>
                  <div>Confidence: {Math.round(ev.extractionConfidence * 100)}%</div>
                </div>
              </div>
              {isOpen && (
                <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500 space-y-1">
                  <p><span className="font-medium">Source:</span> {ev.fileName ?? ev.source}</p>
                  {ev.timestamp && <p><span className="font-medium">Timestamp:</span> {ev.timestamp}</p>}
                  <p>
                    <span className="font-medium">Reliability:</span>{" "}
                    {Math.round(ev.reliability * 100)}% —{" "}
                    {ev.reliability >= 0.8 ? "high source quality" : ev.reliability >= 0.5 ? "moderate source quality" : "low source quality"}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
