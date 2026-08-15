# CausalProof Demo Guide

**Duration:** 5-7 minutes

## Setup

1. Open [http://localhost:3000](http://localhost:3000)
2. Click **Launch Demo**
3. The dashboard loads with a pre-analyzed student retention scenario

## Walkthrough

### 1. Landing Page (30s)

- Point out the product description: "Intervention Failure Forensics"
- Click **Launch Demo** — emphasize this loads synthetic demonstration data

### 2. Dashboard Overview (1 min)

- **KPI Cards** — show outcome deviation, evidence count, leading hypothesis confidence
- **Demo Banner** — "Synthetic Demonstration Data — all numbers are prototype demonstration values"

### 3. Causal Graph (1.5 min)

- Click the **Causal Graph** tab
- Show the vertical chain: Risk Detection → Notification → Counselling → Engagement → Attendance → Dropout Reduction
- Point out the **FAILED** node (Counselling Attendance) and the **EXTERNAL** node (Class Schedule Conflict)
- Click the failed node to show evidence and observed values
- Note the contradictory edge from Counselling → Class Conflict

### 4. Evidence Panel (1 min)

- Click the **Evidence** tab
- Show evidence proof cards with linked metrics
- Expand one card to show source, reliability, and confidence scores
- Point out the "Contradicting" filter

### 5. Hypotheses (1 min)

- Click the **Hypotheses** tab
- Show the leading hypothesis: "Class scheduling conflict overlaps ~68% of missed counselling sessions"
- Note the calibrated status: "Supported by the available evidence"
- Expand to show supporting evidence IDs and alternative explanations

### 6. Counterfactual Lab (1 min)

- Click the **Counterfactual Lab** tab
- Show the custom scenario: change counselling start hour to 16:00 (after class)
- Click **Run Scenario** — show the estimated attendance improvement
- Point out: "ESTIMATE / SCENARIO — NOT OBSERVED FACT"
- Show predefined scenarios and their assumptions

### 7. Redesign Recommendations (30s)

- Click the **Redesign** tab
- Show ranked recommendations: "Move counselling sessions to after-class windows"
- Note impact (High), complexity (Low), evidence count

### 8. Summary (30s)

- Scroll to **Executive Summary** — show the calibrated language
- Show **Missing Information** and **Limitations** sections
- Emphasize: the system never fabricates evidence or claims certainty

## Key Points to Emphasize

1. **Evidence traceability** — every claim links back to source data
2. **Calibrated confidence** — never claims certainty it doesn't have
3. **Deterministic** — same data always produces same results
4. **Honest limitations** — shows what's missing, not just what's found
5. **No external LLM** — the engine is rule-based and explainable

## Resetting the Demo

Navigate back to [http://localhost:3000](http://localhost:3000) and click **Launch Demo** again.
