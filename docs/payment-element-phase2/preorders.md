# Phase 2 (PR-2 series) — Preorders

> Scaffold only. Stacked on `jyotisa/payment-element-phase1`. No implementation yet.

Widen the guarded card-only Payment Element path to cover **Preorders** checkouts, keeping the unchanged backend payload and the CardElement fallback.

- **Relative ease (1-100, higher = easier):** 65
- **Eligibility change:** Route preorder authorizations (SetupIntent) through the Payment Element using the existing SCA/requires_action infra.
- **Today's behavior:** Preorders are not charged at checkout, so they fall back to CardElement.
- **Likely files to touch:** app/javascript/components/Checkout/payment.ts

## Acceptance
- Eligible Preorders carts render the Payment Element; ineligible/flag-off carts keep CardElement.
- Backend payload and charge path unchanged (or explicitly extended with tests).
- Sandbox-proven before the flag is enabled for this case.
