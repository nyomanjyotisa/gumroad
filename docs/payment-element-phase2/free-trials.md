# Phase 2 (PR-2 series) — Free trials

> Scaffold only. Stacked on `jyotisa/payment-element-phase1`. No implementation yet.

Widen the guarded card-only Payment Element path to cover **Free trials** checkouts, keeping the unchanged backend payload and the CardElement fallback.

- **Relative ease (1-100, higher = easier):** 58
- **Eligibility change:** Mount the Payment Element in setup mode for zero-amount free-trial carts that save a card for later billing.
- **Today's behavior:** requiresPayment() is false for zero-amount trials, so they fall back.
- **Likely files to touch:** app/javascript/components/Checkout/PaymentElementForm.tsx

## Acceptance
- Eligible Free trials carts render the Payment Element; ineligible/flag-off carts keep CardElement.
- Backend payload and charge path unchanged (or explicitly extended with tests).
- Sandbox-proven before the flag is enabled for this case.
