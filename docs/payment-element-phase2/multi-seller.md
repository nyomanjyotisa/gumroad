# Phase 2 (PR-2 series) — Multi-seller carts

> Scaffold only. Stacked on `jyotisa/payment-element-phase1`. No implementation yet.

Widen the guarded card-only Payment Element path to cover **Multi-seller carts** checkouts, keeping the unchanged backend payload and the CardElement fallback.

- **Relative ease (1-100, higher = easier):** 22
- **Eligibility change:** Support reusable Payment Element collection across multiple Connect accounts (one buyer action, per-seller charges). Hardest; do last.
- **Today's behavior:** Multi-seller carts require a reusable method and fall back to CardElement.
- **Likely files to touch:** app/services/order/charge_service.rb

## Acceptance
- Eligible Multi-seller carts carts render the Payment Element; ineligible/flag-off carts keep CardElement.
- Backend payload and charge path unchanged (or explicitly extended with tests).
- Sandbox-proven before the flag is enabled for this case.
