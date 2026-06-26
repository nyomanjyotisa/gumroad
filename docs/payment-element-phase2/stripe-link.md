# Phase 2 (PR-2 series) — Stripe Link

> Scaffold only. Stacked on `jyotisa/payment-element-phase1`. No implementation yet.

Widen the guarded card-only Payment Element path to cover **Stripe Link** checkouts, keeping the unchanged backend payload and the CardElement fallback.

- **Relative ease (1-100, higher = easier):** 82
- **Eligibility change:** Enable Link inside the Payment Element after confirming createPaymentMethod still returns a backend-compatible card PaymentMethod.
- **Today's behavior:** Link is suppressed; Payment Element is card-only.
- **Likely files to touch:** app/javascript/components/Checkout/PaymentElementForm.tsx

## Acceptance
- Eligible Stripe Link carts render the Payment Element; ineligible/flag-off carts keep CardElement.
- Backend payload and charge path unchanged (or explicitly extended with tests).
- Sandbox-proven before the flag is enabled for this case.
