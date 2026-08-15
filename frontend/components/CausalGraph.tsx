"use client";

import { useMemo } from "react";

interface GraphNode {
  id: string;
  label: string;
  kind: string;
  status: string;
  description?: string;
  observedValue?: string;
  expectedValue?: string;
  evidence?: string[];
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  relation: string;
  reason?: string;
}

interface Divergence {
  id: string;
  type: string;
  confidence: number;
}

interface CausalGraphProps {
  intended: GraphNode[];
  observed: GraphNode[];
  edges: GraphEdge[];
  divergences: Divergence[];
}

const STATUS_COLORS: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  EXPECTED: { bg: "bg-slate-50", border: "border-slate-300", text: "text-slate-700", icon: "○" },
  OBSERVED: { bg: "bg-emerald-50", border: "border-emerald-400", text: "text-emerald-700", icon: "●" },
  FAILED: { bg: "bg-red-50", border: "border-red-400", text: "text-red-700", icon: "✗" },
  UNCERTAIN: { bg: "bg-amber-50", border: "border-amber-300", text: "text-amber-700", icon: "?" },
  EXTERNAL: { bg: "bg-blue-50", border: "border-blue-400", text: "text-blue-700", icon: "◆" },
};

const EDGE_COLORS: Record<string, string> = {
  expected: "#94a3b8",
  observed: "#10b981",
  contradictory: "#ef4444",
  possible: "#d1d5db",
};

export default function CausalGraph({ intended, observed, edges, divergences }: CausalGraphProps) {
  // Merge intended + observed by id
  const nodes = useMemo(() => {
    const map = new Map<string, GraphNode>();
    for (const n of intended) map.set(n.id, { ...n, status: n.status });
    for (const n of observed) {
      const existing = map.get(n.id);
      if (existing) {
        map.set(n.id, { ...existing, ...n });
      } else {
        map.set(n.id, n);
      }
    }
    return [...map.values()];
  }, [intended, observed]);

  // Layout: simple vertical chain + branches
  const layout = useMemo(() => {
    const positions = new Map<string, { x: number; y: number }>();
    const mainChain = nodes.filter((n) => !n.id.startsWith("n_class") && !n.id.startsWith("n_dropout_remains"));
    const extras = nodes.filter((n) => n.id.startsWith("n_class") || n.id.startsWith("n_dropout_remains"));

    mainChain.forEach((n, i) => {
      positions.set(n.id, { x: 300, y: 80 + i * 120 });
    });

    extras.forEach((n, i) => {
      positions.set(n.id, { x: 600 + i * 200, y: 200 + i * 160 });
    });

    return positions;
  }, [nodes]);

  if (nodes.length === 0) {
    return (
      <div className="card p-8 text-center text-slate-500">
        No pathway nodes to display. Run the analysis first.
      </div>
    );
  }

  // Compute bounding box
  let maxX = 0, maxY = 0;
  layout.forEach((p) => {
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  });
  const svgW = Math.max(800, maxX + 250);
  const svgH = Math.max(400, maxY + 120);

  return (
    <div className="card p-6 overflow-x-auto">
      <h3 className="font-semibold mb-4">Intended vs. Observed Pathway</h3>
      <div className="flex gap-4 mb-4 flex-wrap">
        {Object.entries(STATUS_COLORS).map(([key, val]) => (
          <span key={key} className={`badge ${val.bg} ${val.border} ${val.text} border`}>
            {val.icon} {key}
          </span>
        ))}
      </div>
      <svg
        width={svgW}
        height={svgH}
        viewBox={`0 0 ${svgW} ${svgH}`}
        className="w-full"
        style={{ minWidth: "600px" }}
      >
        {/* Edges */}
        {edges.map((edge) => {
          const s = layout.get(edge.source);
          const t = layout.get(edge.target);
          if (!s || !t) return null;
          const color = EDGE_COLORS[edge.relation] ?? "#d1d5db";
          const dashed = edge.relation === "contradictory";
          return (
            <g key={edge.id}>
              <line
                x1={s.x + 75}
                y1={s.y + 28}
                x2={t.x + 75}
                y2={t.y}
                stroke={color}
                strokeWidth={2}
                strokeDasharray={dashed ? "6 4" : "none"}
                markerEnd="url(#arrow)"
              />
              {edge.reason && (
                <text
                  x={(s.x + t.x) / 2 + 80}
                  y={(s.y + t.y) / 2 + 14}
                  fontSize={10}
                  fill="#6b7280"
                >
                  {edge.reason.slice(0, 40)}
                </text>
              )}
            </g>
          );
        })}
        {/* Nodes */}
        {nodes.map((node) => {
          const pos = layout.get(node.id);
          if (!pos) return null;
          const style = STATUS_COLORS[node.status] ?? STATUS_COLORS.EXPECTED;
          const w = 150, h = 56;
          return (
            <g key={node.id}>
              <rect
                x={pos.x}
                y={pos.y}
                width={w}
                height={h}
                rx={8}
                className={`${style.bg}`}
                stroke={style.border.replace("border-", "").replace("border-", "#")}
                strokeWidth={2}
                fill={style.bg === "bg-slate-50" ? "#f8fafc" :
                      style.bg === "bg-emerald-50" ? "#ecfdf5" :
                      style.bg === "bg-red-50" ? "#fef2f2" :
                      style.bg === "bg-amber-50" ? "#fffbeb" :
                      style.bg === "bg-blue-50" ? "#eff6ff" : "#f8fafc"}
              />
              <text x={pos.x + 10} y={pos.y + 18} fontSize={11} fontWeight={600} fill="#0f172a">
                {style.icon} {node.label.slice(0, 18)}
              </text>
              <text x={pos.x + 10} y={pos.y + 34} fontSize={10} fill="#64748b">
                {node.observedValue ? `Observed: ${node.observedValue}` : node.status}
              </text>
              {node.evidence && node.evidence.length > 0 && (
                <text x={pos.x + 10} y={pos.y + 48} fontSize={9} fill="#94a3b8">
                  {node.evidence.length} evidence item(s)
                </text>
              )}
            </g>
          );
        })}
        <defs>
          <marker id="arrow" viewBox="0 0 10 7" refX="10" refY="3.5" markerWidth={8} markerHeight={6} orient="auto-start-reverse">
            <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
          </marker>
        </defs>
      </svg>

      {/* Divergence Legend */}
      {divergences.length > 0 && (
        <div className="mt-4 text-sm">
          <p className="font-medium mb-2">Divergence Points ({divergences.length}):</p>
          <div className="space-y-1">
            {divergences.map((d) => (
              <div key={d.id} className="flex items-center gap-2 text-xs">
                <span className={`badge ${d.confidence >= 60 ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>
                  {d.confidence}%
                </span>
                <span className="text-slate-600">
                  {d.type.replace(/_/g, " ")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
