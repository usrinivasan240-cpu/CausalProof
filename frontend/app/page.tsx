"use client";

import { useState } from "react";

export default function LandingPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const launchDemo = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/demo", { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Demo load failed.");
        setLoading(false);
        return;
      }
      // Store token for demo mode (no auth required for demo)
      localStorage.setItem("cp_token", "cp_demo_token_2026");
      localStorage.setItem("cp_investigation_id", json.investigation.id);
      window.location.href = "/dashboard";
    } catch {
      setError("Network error — is the server running?");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="max-w-2xl text-center">
        <h1 className="text-4xl font-bold tracking-tight text-ink mb-4">
          CausalProof
        </h1>
        <p className="text-lg text-slate-600 mb-2">
          AI-Powered Intervention Failure Forensics & Redesign Engine
        </p>
        <p className="text-sm text-slate-500 mb-8 leading-relaxed">
          CausalProof helps you understand not merely that an intervention failed,
          but where the intended causal pathway diverged, what evidence supports
          the suspected failure, and how alternative interventions could be evaluated.
        </p>

        <div className="card p-8 mb-8">
          <h2 className="text-xl font-semibold mb-3">Quick Start</h2>
          <p className="text-sm text-slate-500 mb-6">
            Launch the interactive demo with a pre-loaded student retention
            scenario. All data is synthetic demonstration data.
          </p>
          <button
            onClick={launchDemo}
            disabled={loading}
            className="btn-primary text-base px-8 py-3 w-full sm:w-auto disabled:opacity-60"
          >
            {loading ? "Loading demo..." : "Launch Demo"}
          </button>
          {error && (
            <p className="mt-4 text-sm text-red-600">{error}</p>
          )}
        </div>

        <div className="text-left card p-6">
          <h3 className="font-semibold mb-2">What CausalProof does</h3>
          <ul className="text-sm text-slate-600 space-y-1 list-disc list-inside">
            <li>Reconstructs intended vs. observed intervention pathways</li>
            <li>Identifies causal divergence points with evidence</li>
            <li>Generates competing failure hypotheses with calibrated confidence</li>
            <li>Simulates counterfactual redesign scenarios</li>
            <li>Recommends evidence-backed intervention redesigns</li>
          </ul>
        </div>

        <p className="mt-8 text-xs text-slate-400">
          Synthetic Demonstration Data — all numbers are prototype demonstration
          values, not real-world statistics.
        </p>
      </div>
    </main>
  );
}
