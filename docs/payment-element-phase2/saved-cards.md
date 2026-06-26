# Phase 2 (PR-2 series) — Saved cards

> Scaffold only. Stacked on `jyotisa/payment-element-phase1`. No implementation yet.

Widen the guarded card-only Payment Element path to cover **Saved cards** checkouts, keeping the unchanged backend payload and the CardElement fallback.

- **Relative ease (1–100, higher = easier):** 88
- **Eligibility change:** Allow a buyer who has a saved card to enter a NEW card through the Payment Element while keeping the saved-card toggle.
- **Today's behavior:** isPaymentElementEligible() returns false when state.savedCreditCard is present.
- **Likely files to touch:** app/javascript/components/Checkout/payment.ts, PaymentElementForm.tsx, PaymentForm.tsx

## Acceptance
- Eligible Saved cards carts render the Payment Element; ineligible/flag-off carts keep CardElement.
- Backend payload and charge path unchanged (or explicitly extended with tests).
- Sandbox-proven before the flag is enabled for this case.
