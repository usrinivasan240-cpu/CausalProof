"use client";

import { useState } from "react";

interface Counterfactual {
  id: string;
  metric: string;
  observed: number;
  counterfactual: number;
  difference: number;
  assumptions: string[];
  confidence: number;
  isSimulation: true;
}

interface CounterfactualLabProps {
  counterfactuals: Counterfactual[];
  investigationId: string;
}

export default function CounterfactualLab({ counterfactuals, investigationId }: CounterfactualLabProps) {
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
  const [customTime, setCustomTime] = useState(16);
  const [customResult, setCustomResult] = useState<Counterfactual | null>(null);
  const [loading, setLoading] = useState(false);

  const runCustom = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/counterfactual", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("cp_token") ?? ""}`,
        },
        body: JSON.stringify({
          investigationId,
          variable: "counselling_time",
          value: customTime,
        }),
      });
      const json = await res.json();
      if (res.ok && json.counterfactuals?.length) {
        setCustomResult(json.counterfactuals[0]);
      }
    } catch {
      // ignore
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-3">
          <h3 className="font-semibold">Counterfactual Redesign Lab</h3>
          <span className="badge bg-amber-50 text-amber-700 text-[10px]">SIMULATION</span>
        </div>
        <p className="text-sm text-slate-500 mb-4">
          Modify an intervention variable and estimate its effect. All results
          are <span className="font-semibold">ESTIMATES / SCENARIOS — NOT OBSERVED FACTS</span>.
        </p>

        <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-xs text-amber-800 mb-4">
          These simulations use simple, deterministic rules. They are not predictive models.
          All assumptions are stated explicitly.
        </div>

        {/* Custom scenario */}
        <div className="border border-slate-200 rounded-md p-4 mb-4">
          <h4 className="font-medium text-sm mb-2">Custom Scenario: Reschedule Counselling</h4>
          <div className="flex items-center gap-4">
            <label className="text-sm text-slate-600">
              Counselling start hour:
              <input
                type="number"
                min={8}
                max={20}
                value={customTime}
                onChange={(e) => setCustomTime(Number(e.target.value))}
                className="ml-2 w-16 border border-slate-300 rounded px-2 py-1 text-sm"
              />
            </label>
            <button onClick={runCustom} disabled={loading} className="btn-primary text-xs">
              {loading ? "Simulating..." : "Run Scenario"}
            </button>
          </div>
          {customResult && (
            <div className="mt-3 p-3 bg-slate-50 rounded text-sm">
              <p className="font-medium">{customResult.metric}</p>
              <p className="text-slate-600">
                Observed: <span className="font-mono">{customResult.observed.toFixed(1)}</span>{" → "}
                Simulated: <span className="font-mono">{customResult.counterfactual.toFixed(1)}</span>{" "}
                (Δ {customResult.difference >= 0 ? "+" : ""}{customResult.difference.toFixed(1)})
              </p>
              <p className="text-xs text-amber-600 mt-1">
                ESTIMATE / SCENARIO — NOT OBSERVED FACT · Confidence: {customResult.confidence}%
              </p>
            </div>
          )}
        </div>

        {/* Predefined scenarios */}
        <h4 className="font-medium text-sm mb-2">Predefined Scenarios</h4>
        <div className="space-y-3">
          {counterfactuals.map((cf) => {
            const isOpen = selectedScenario === cf.id;
            return (
              <div
                key={cf.id}
                className="border border-slate-200 rounded-md p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => setSelectedScenario(isOpen ? null : cf.id)}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-ink">{cf.metric}</p>
                    <p className="text-xs text-slate-500">
                      Observed: {cf.observed.toFixed(1)} → Simulated: {cf.counterfactual.toFixed(1)}{" "}
                      <span className={`font-medium ${cf.difference > 0 ? "text-emerald-600" : cf.difference < 0 ? "text-red-600" : ""}`}>
                        (Δ {cf.difference >= 0 ? "+" : ""}{cf.difference.toFixed(1)})
                      </span>
                    </p>
                  </div>
                  <span className="text-xs text-slate-400">{cf.confidence}% confidence</span>
                </div>
                {isOpen && (
                  <div className="mt-3 pt-3 border-t border-slate-100 text-xs space-y-2">
                    <p className="font-medium text-slate-700">Assumptions:</p>
                    <ul className="list-disc list-inside text-slate-500 space-y-0.5">
                      {cf.assumptions.map((a, i) => <li key={i}>{a}</li>)}
                    </ul>
                    <p className="text-amber-600 italic mt-2">
                      ESTIMATE / SCENARIO — NOT OBSERVED FACT
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
