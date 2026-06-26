# frozen_string_literal: true

# Server-side source of truth for the Stripe Payment Element rollout (issue #5362, Phase 2).
#
# Resolves, per seller, whether a checkout should offer the Payment Element lane, which payment
# method types are allowed, and why it falls back when it doesn't. The browser receives this
# decision via checkout props and renders the resolved lane; backend order creation re-resolves
# from server-owned data (the seller) rather than trusting the client's reported surface.
#
# Phase 2 is card-only: automatic_payment_methods and local/redirect methods are later phases, and
# multi-seller carts that would need multiple seller PaymentIntents stay on card + existing PayPal.
class Checkout::PaymentMethodEligibility
  CARD = "card"

  Result = Struct.new(:payment_element_enabled, :allowed_payment_method_types, :fallback_reason, keyword_init: true)

  def self.for_seller(seller)
    new(seller:).resolve
  end

  def initialize(seller:)
    @seller = seller
  end

  def resolve
    return fallback(:flag_off) unless Feature.active?(:stripe_payment_element, @seller)

    Result.new(payment_element_enabled: true, allowed_payment_method_types: [CARD], fallback_reason: nil)
  end

  private
    def fallback(reason)
      Result.new(payment_element_enabled: false, allowed_payment_method_types: [CARD], fallback_reason: reason.to_s)
    end
end
