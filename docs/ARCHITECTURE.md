# CausalProof Architecture

## System Overview

CausalProof is a TypeScript monorepo with Next.js 15 serving both the API backend and React frontend. The analysis engine is a pure TypeScript module with no external dependencies.

## Components

### 1. Analysis Engine (`frontend/lib/engine/`)

The core deterministic analysis pipeline:

```
types.ts          — All domain types (Investigation, Evidence, Pathway, etc.)
csv.ts            — RFC-4180 CSV parser, data file parsing
validation.ts     — Upload validation, rate limiting, input sanitization
evidence.ts       — Evidence extraction from CSV/TXT/JSON/PDF files
confidence.ts     — Calibrated confidence computation
constraints.ts    — Expected-value constraint parsing and checking
observedPathway.ts — Observed pathway reconstruction from evidence facts
divergence.ts     — Causal divergence detection
hypotheses.ts     — Competing failure hypothesis generation
counterfactual.ts — Deterministic counterfactual simulation
recommendations.ts — Ranked intervention redesigns
pipeline.ts       — Full analysis orchestrator
```

### 2. API Layer (`frontend/app/api/`)

Next.js Route Handlers that expose REST endpoints:

- **auth/** — Token-based authentication
- **investigations/** — CRUD for investigations
- **upload/** — File upload with validation
- **pathway/** — Intended/observed pathway management
- **analyze/** — Full pipeline execution
- **counterfactual/** — Custom scenario simulation
- **recommendations/** — Redesign generation
- **graph/** — Causal graph data
- **evidence/** — Evidence retrieval
- **demo/** — Demo mode loader

### 3. Frontend (`frontend/app/`, `frontend/components/`)

React components rendered server-side:

- **Landing page** — Demo launcher
- **Dashboard** — Tabbed analysis view
- **CausalGraph** — SVG pathway visualization
- **EvidencePanel** — Expandable evidence proof cards
- **HypothesisPanel** — Competing hypotheses with confidence
- **CounterfactualLab** — Interactive scenario simulator
- **RecommendationsPanel** — Ranked redesign table
- **SummaryPanel** — Executive summary, missing info, limitations

### 4. Storage (`frontend/lib/storage.ts`)

JSON-file persistence under `data/store/`:

```
data/store/investigations.json
data/store/intended_{id}.json
data/store/evidence_{id}.json
data/store/uploads_{id}.json
data/store/report_{id}.json
```

### 5. Demo Data (`frontend/lib/demo/`)

- **generate.ts** — Deterministic synthetic data generator (mulberry32 PRNG)
- **seed.ts** — Demo loader that writes files, extracts evidence, runs analysis

## Data Flow

```
User uploads files
       ↓
  validateUpload() — extension, size, MIME
       ↓
  parseDataFile() — CSV/JSON/TXT parsing
       ↓
  extractEvidence() — rule-based evidence extraction
       ↓
  saveEvidence() — persist to JSON store
       ↓
  runAnalysis()
       ├─ extractFacts() — evidence → numeric facts
       ├─ buildObservedPathway() — facts → observed nodes
       ├─ detectDivergences() — intended vs observed
       ├─ generateHypotheses() — competing explanations
       ├─ runCounterfactuals() — simulation scenarios
       └─ generateRecommendations() — redesign options
       ↓
  saveReport() — persist full analysis report
       ↓
  Frontend renders dashboard with graph, evidence, hypotheses
```

## AI Flow

The analysis engine is deterministic and rule-based. No external LLM is required.

**Evidence extraction** uses pattern matching and statistical aggregation:
- CSV columns → numeric summaries (mean, min, max, count)
- Demo schema recognition → domain-specific evidence
- Text files → sentence extraction with keyword matching
- PDF → noted as unsupported (honest limitation)

**Confidence** is computed from evidence weights:
- `evidenceWeight()` — bounded weighted sum
- `combinedConfidence()` — support × coverage − contradiction
- `statusFromConfidence()` — calibrated status mapping

## Causal Reasoning Flow

1. **Intended pathway** — user-defined nodes with expected metrics
2. **Observed pathway** — reconstructed from evidence facts
3. **Divergence detection** — rule-based comparison with confidence
4. **Hypothesis generation** — competing explanations with evidence
5. **Counterfactual simulation** — deterministic effect estimation
6. **Recommendation ranking** — impact × complexity × confidence

## Security Architecture

- **Authentication** — Token-based (demo mode: any credentials accepted)
- **Rate limiting** — In-memory per-IP sliding window
- **Input validation** — Zod schemas, extension/MIME checks, size limits
- **Key sanitization** — Prototype pollution prevention
- **Secrets** — Environment variables only, never committed
- **Error handling** — No sensitive data in error responses

## Domain Adaptability

The engine is domain-agnostic. Domain-specific behavior is driven by:
- Evidence extraction patterns (keyword matching on file names/content)
- Metric mapping (expected metrics on pathway nodes)
- Constraint checking (expected values vs observed facts)

Default domain: Education (Student Retention). Future domains require only:
1. New evidence extraction patterns
2. New demo data files
3. Domain-specific pathway definitions
