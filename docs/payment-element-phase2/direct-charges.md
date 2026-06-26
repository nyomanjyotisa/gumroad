# Phase 2 (PR-2 series) — Direct charges (Connect)

> Scaffold only. Stacked on `jyotisa/payment-element-phase1`. No implementation yet.

Widen the guarded card-only Payment Element path to cover **Direct charges (Connect)** checkouts, keeping the unchanged backend payload and the CardElement fallback.

- **Relative ease (1-100, higher = easier):** 75
- **Eligibility change:** Route single-seller Stripe Connect direct-charge carts through the Payment Element; verify the PaymentMethod clones to the connected account.
- **Today's behavior:** Eligible already in principle; this PR adds explicit coverage + tests.
- **Likely files to touch:** app/business/payments/charging/implementations/stripe/stripe_chargeable_payment_method.rb

## Acceptance
- Eligible Direct charges (Connect) carts render the Payment Element; ineligible/flag-off carts keep CardElement.
- Backend payload and charge path unchanged (or explicitly extended with tests).
- Sandbox-proven before the flag is enabled for this case.
