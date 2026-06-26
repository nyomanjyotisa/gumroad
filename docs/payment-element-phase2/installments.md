# Phase 2 (PR-2 series) — Installments

> Scaffold only. Stacked on `jyotisa/payment-element-phase1`. No implementation yet.

Widen the guarded card-only Payment Element path to cover **Installments** checkouts, keeping the unchanged backend payload and the CardElement fallback.

- **Relative ease (1-100, higher = easier):** 50
- **Eligibility change:** Route the first installment charge through the Payment Element; later off-session installments stay on the existing path.
- **Today's behavior:** pay_in_installments carts are excluded from eligibility.
- **Likely files to touch:** app/javascript/components/Checkout/payment.ts

## Acceptance
- Eligible Installments carts render the Payment Element; ineligible/flag-off carts keep CardElement.
- Backend payload and charge path unchanged (or explicitly extended with tests).
- Sandbox-proven before the flag is enabled for this case.
