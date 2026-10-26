# SmartQMS 7-Phase Closed-Loop Quality Workflow

## 1. Quality Engineering Philosophy

SmartQMS replaces fragmented spreadsheets and ad-hoc sign-offs with an automated quality lifecycle:

$$\text{PLAN} \longrightarrow \text{DEFINE} \longrightarrow \text{EXECUTE} \longrightarrow \text{VERIFY} \longrightarrow \text{MEASURE} \longrightarrow \text{REPORT} \longrightarrow \text{IMPROVE}$$

---

## 2. Detailed Phase Walkthrough

### Phase 1: PLAN (Quality Planning & Risk Mitigation)
- Establish measurable quality objectives mapped to ISO/IEC 25010 characteristics:
  - Reliability (Payment Integrity)
  - Security (Cardholder Data Protection)
  - Correctness (Pricing & Inventory Logic)
  - Maintainability (Code Modularity)
  - Performance Efficiency (Response Latency Under Load)
  - Testability (Test Coverage & Traceability)
- Log proactive risks with Probability $\times$ Impact matrices (e.g., webhook retry race condition $\to$ Redis distributed lock mitigation).

### Phase 2: DEFINE (Requirements & Acceptance Criteria)
- Formulate immutable functional specifications with measurable acceptance criteria.
- 10-Point Requirement Quality Checklist:
  1. Complete & Unambiguous
  2. Testable & Measurable
  3. Consistent & Traceable
  4. Feasible Under Architecture
  5. Correct E-Commerce Domain Logic
  6. Edge Case Handling (Cart Expiration, Stock Drop)
  7. Clear Idempotency Specification
  8. Security Standards (PCI-DSS & Auth Token Handling)
  9. Error Handling & Recovery Path
  10. Stakeholder & Owner Alignment
- Revising approved requirements increments version (`v1.0` $\to$ `v2.0`) and resets review status.

### Phase 3: EXECUTE (Architecture & Code Reviews)
- **Preliminary & Final Design Reviews (PDR/FDR)**: Baselined using 10-point architectural checklist.
- **Peer Code Reviews**: Dual control enforced — developers are strictly prohibited from approving their own pull requests.

### Phase 4: VERIFY (10-Scenario Test Management & Execution)
- Comprehensive test suite covering e-commerce edge cases:
  - `TC-01-001`: Payment Gateway Integration (Stripe webhook validation)
  - `TC-01-002`: Shopping Cart Subtotal & Coupon Discount Precision
  - `TC-01-003`: Concurrency Inventory Locking on Flash Sale Checkout
  - `TC-01-004`: Idempotency Key Processing on Duplicate Webhooks
  - `TC-01-005`: Order State Machine Transitions
  - `TC-01-006`: PCI-DSS Zero Plaintext Cardholder Storage
  - `TC-01-007`: Redis Distributed Mutex Deadlock Recovery
  - `TC-01-008`: API Response Latency under 1,000 Concurrent Requests
  - `TC-01-009`: Tax Recalculation across Multiple Jurisdictions
  - `TC-01-010`: Refund & Chargeback Ledger Reversal

### Phase 5: MEASURE (Software Development Quality Metrics)
- Normalized development metrics calculated from verified repository data:
  - **DevP** = $\frac{\text{Development Hours}}{\text{KLOC}}$ (Target: $\le 50.0$ hrs/KLOC)
  - **CRe** = $\left(\frac{\text{Reused KLOC}}{\text{Total KLOC}}\right) \times 100$ (Target: $\ge 20.0\%$)
  - **DocRe** = $\left(\frac{\text{Reused Docs}}{\text{Total Docs}}\right) \times 100$ (Target: $\ge 25.0\%$)
  - **Defect Density** = $\frac{\text{Total Defects}}{\text{KLOC}}$
  - **Defect Leakage Rate** = $\left(\frac{\text{Post-Release Defects}}{\text{Total Defects}}\right) \times 100$

### Phase 6: REPORT (Compliance & Audit Trail)
- 1-Click PDF & CSV executive summaries.
- 21 CFR Part 11 compliant audit trail tracking all actions, timestamps, and usernames.

### Phase 7: IMPROVE (Closed-Loop CAPA)
- Corrective and Preventive Action workflow:
  1. Incident Identification
  2. 5-Why Root Cause Analysis (RCA)
  3. Immediate Containment Action
  4. Permanent Corrective Action
  5. Preventive Recurrence Action
  6. Effectiveness Verification Prior to Closure
