"use client";

interface KpiCardsProps {
  divergences: { id: string; confidence: number }[];
  evidenceCount: number;
  confidence: number;
  hypotheses: { id: string; isLeading: boolean; failureCategory: string; confidence: number; status: string }[];
}

export default function KpiCards({ divergences, evidenceCount, confidence, hypotheses }: KpiCardsProps) {
  const leading = hypotheses.find((h) => h.isLeading);
  const criticalDiv = divergences.filter((d) => d.confidence >= 60).length;

  const cards = [
    { label: "Outcome Deviation", value: `${divergences.length}`, sub: `${criticalDiv} high-confidence` },
    { label: "Evidence Items", value: `${evidenceCount}`, sub: "linked to claims" },
    { label: "Leading Hypothesis", value: leading ? leading.failureCategory : "—", sub: leading ? `${leading.confidence}% confidence` : "none identified" },
    { label: "Overall Confidence", value: `${confidence}%`, sub: "weighted average" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((c) => (
        <div key={c.label} className="card p-4">
          <p className="text-xs text-slate-500 mb-1">{c.label}</p>
          <p className="text-2xl font-bold text-ink capitalize">{c.value}</p>
          <p className="text-xs text-slate-400 mt-1">{c.sub}</p>
        </div>
      ))}
    </div>
  );
}
