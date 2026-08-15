"use client";

interface SummaryPanelProps {
  summary: string;
  missingInformation: string[];
  limitations: string[];
}

export default function SummaryPanel({ summary, missingInformation, limitations }: SummaryPanelProps) {
  return (
    <div className="mt-8 space-y-4">
      {summary && (
        <div className="card p-6">
          <h3 className="font-semibold mb-2">Executive Summary</h3>
          <p className="text-sm text-slate-600 leading-relaxed">{summary}</p>
        </div>
      )}

      {missingInformation.length > 0 && (
        <div className="card p-6">
          <h3 className="font-semibold mb-2">Missing Information</h3>
          <ul className="text-sm text-slate-600 space-y-1 list-disc list-inside">
            {missingInformation.map((m, i) => <li key={i}>{m}</li>)}
          </ul>
        </div>
      )}

      {limitations.length > 0 && (
        <div className="card p-6">
          <h3 className="font-semibold mb-2">Limitations</h3>
          <ul className="text-sm text-slate-600 space-y-1 list-disc list-inside">
            {limitations.map((l, i) => <li key={i}>{l}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
