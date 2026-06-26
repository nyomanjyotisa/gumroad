# Phase 2 (PR-2 series) — Subscriptions

> Scaffold only. Stacked on `jyotisa/payment-element-phase1`. No implementation yet.

Widen the guarded card-only Payment Element path to cover **Subscriptions** checkouts, keeping the unchanged backend payload and the CardElement fallback.

- **Relative ease (1-100, higher = easier):** 40
- **Eligibility change:** Move the reusable-payment-method flow (confirmCardSetup) onto the Payment Element deferred setup flow (confirmSetup).
- **Today's behavior:** requiresReusablePaymentMethod() excludes subscriptions; they fall back.
- **Likely files to touch:** app/javascript/data/card_payment_method_data.ts

## Acceptance
- Eligible Subscriptions carts render the Payment Element; ineligible/flag-off carts keep CardElement.
- Backend payload and charge path unchanged (or explicitly extended with tests).
- Sandbox-proven before the flag is enabled for this case.
