"use client";

interface Recommendation {
  id: string;
  title: string;
  intervention: string;
  expectedMechanism: string;
  supportingEvidence: string[];
  assumptions: string[];
  expectedBenefit: string;
  impact: string;
  complexity: string;
  unintendedConsequences: string[];
  confidence: number;
}

const IMPACT_COLORS: Record<string, string> = {
  High: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Medium: "bg-blue-50 text-blue-700 border-blue-200",
  Low: "bg-slate-50 text-slate-600 border-slate-200",
};

const COMPLEXITY_COLORS: Record<string, string> = {
  High: "bg-red-50 text-red-700",
  Medium: "bg-amber-50 text-amber-700",
  Low: "bg-emerald-50 text-emerald-700",
};

export default function RecommendationsPanel({ recommendations }: { recommendations: Recommendation[] }) {
  if (recommendations.length === 0) {
    return <div className="card p-6 text-center text-slate-500">No recommendations generated. Run the analysis first.</div>;
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Ranked Intervention Redesigns</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
              <th className="pb-2 pr-4">#</th>
              <th className="pb-2 pr-4">Recommendation</th>
              <th className="pb-2 pr-4">Impact</th>
              <th className="pb-2 pr-4">Complexity</th>
              <th className="pb-2 pr-4">Evidence</th>
              <th className="pb-2">Confidence</th>
            </tr>
          </thead>
          <tbody>
            {recommendations.map((rec, i) => (
              <tr key={rec.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="py-3 pr-4 text-slate-400 font-mono">{i + 1}</td>
                <td className="py-3 pr-4">
                  <p className="font-medium text-ink">{rec.title}</p>
                  <p className="text-xs text-slate-500 mt-1">{rec.expectedMechanism}</p>
                </td>
                <td className="py-3 pr-4">
                  <span className={`badge border text-xs ${IMPACT_COLORS[rec.impact] ?? ""}`}>{rec.impact}</span>
                </td>
                <td className="py-3 pr-4">
                  <span className={`badge text-xs ${COMPLEXITY_COLORS[rec.complexity] ?? ""}`}>{rec.complexity}</span>
                </td>
                <td className="py-3 pr-4 text-xs text-slate-500">{rec.supportingEvidence.length} item(s)</td>
                <td className="py-3 text-xs font-mono">{rec.confidence}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Expanded details */}
      <div className="space-y-3">
        {recommendations.map((rec) => (
          <details key={rec.id} className="card p-4">
            <summary className="cursor-pointer text-sm font-medium text-ink hover:text-accent">
              {rec.title} — {rec.expectedBenefit}
            </summary>
            <div className="mt-3 space-y-2 text-xs">
              <div>
                <p className="font-medium text-slate-700">Intervention:</p>
                <p className="text-slate-600">{rec.intervention}</p>
              </div>
              <div>
                <p className="font-medium text-slate-700">Supporting Evidence:</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {rec.supportingEvidence.map((id) => (
                    <span key={id} className="badge badge-observed text-[10px]">{id}</span>
                  ))}
                </div>
              </div>
              <div>
                <p className="font-medium text-slate-700">Assumptions:</p>
                <ul className="list-disc list-inside text-slate-500">
                  {rec.assumptions.map((a, i) => <li key={i}>{a}</li>)}
                </ul>
              </div>
              {rec.unintendedConsequences.length > 0 && (
                <div>
                  <p className="font-medium text-slate-700">Potential Unintended Consequences:</p>
                  <ul className="list-disc list-inside text-red-600/80">
                    {rec.unintendedConsequences.map((u, i) => <li key={i}>{u}</li>)}
                  </ul>
                </div>
              )}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
