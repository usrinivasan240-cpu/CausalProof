# CausalProof

**AI-Powered Intervention Failure Forensics & Redesign Engine**

CausalProof helps you understand not merely that an intervention failed, but where the intended causal pathway diverged, what evidence supports the suspected failure, and how alternative interventions could be evaluated.

## Problem

Organizations introduce interventions (education programs, healthcare initiatives, government schemes, business process changes) to solve real-world problems. When outcomes don't meet expectations, conventional analytics show *what* happened but cannot provide a structured investigation of *why*.

## Solution

CausalProof operationalizes an evidence-linked workflow:

1. **Plan** â€” Define the intended causal pathway
2. **Implement** â€” Upload real-world data
3. **Observe** â€” Reconstruct what actually happened
4. **Trace** â€” Identify where pathways diverged
5. **Diagnose** â€” Classify failure types and generate competing hypotheses
6. **Prove** â€” Link every claim to evidence with calibrated confidence
7. **Replay** â€” Simulate counterfactual scenarios
8. **Redesign** â€” Generate evidence-backed intervention redesigns

## Architecture

```
causalproof/
â”œâ”€â”€ frontend/           # Next.js 15 App Router (API + UI)
â”‚   â”œâ”€â”€ app/            # Pages and API routes
â”‚   â”œâ”€â”€ components/     # React components
â”‚   â”œâ”€â”€ lib/engine/     # Deterministic causal analysis engine
â”‚   â””â”€â”€ lib/demo/       # Synthetic demo data
â”œâ”€â”€ data/               # Persisted data (JSON files)
â””â”€â”€ docs/               # Documentation
```

**Tech Stack:**
- Next.js 15, React 19, TypeScript, Tailwind CSS
- Deterministic rule-based analysis engine (no external LLM required)
- Zod validation, Vitest testing
- JSON-file persistence (no database required)

## Quick Start

```bash
cd causalproof/frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and click **Launch Demo**.

## Demo Mode

Demo Mode loads a pre-built student retention scenario with synthetic data. All numbers are demonstration values, not real-world statistics.

The demo includes:
- 200 synthetic students (120 high-risk)
- 6 CSV files + 1 text file
- Pre-analyzed report with causal graph, evidence, hypotheses, counterfactuals, and recommendations
- Fully deterministic â€” same data always produces same results

## Environment Variables

Copy `.env.example` to `.env.local`:

```bash
DEMO_USER=admin
DEMO_PASS_HASH=           # Leave blank for demo mode (no auth)
DEMO_API_TOKEN=cp_demo_token_2026
```

## API Endpoints

All endpoints require `Authorization: Bearer <token>` header.

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth` | Authenticate and get token |
| POST | `/api/demo` | Load demo dataset and run analysis |
| GET | `/api/investigations` | List all investigations |
| POST | `/api/investigations` | Create new investigation |
| GET | `/api/investigations/[id]` | Get investigation details |
| POST | `/api/upload` | Upload data file (multipart form) |
| POST | `/api/pathway/intended` | Define intended pathway |
| GET | `/api/pathway/observed` | Get observed pathway |
| POST | `/api/analyze` | Run full analysis pipeline |
| POST | `/api/counterfactual` | Run counterfactual simulation |
| POST | `/api/recommendations` | Generate redesign recommendations |
| GET | `/api/graph/[id]` | Get causal graph data |
| GET | `/api/evidence` | Get evidence items |

## Testing

```bash
cd causalproof/frontend
npm test
```

69 tests covering:
- CSV parsing and validation
- Evidence extraction
- Divergence detection
- Hypothesis generation
- Counterfactual simulation
- Recommendations
- Full pipeline integration

## Limitations

See `docs/LIMITATIONS.md` for detailed discussion of:
- Causal inference limitations
- Deterministic engine constraints
- Simulation assumptions
- Data quality considerations

## License

Prototype for HackFusion evaluation.
