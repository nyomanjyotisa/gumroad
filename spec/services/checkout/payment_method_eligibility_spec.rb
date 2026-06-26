# frozen_string_literal: true

describe Checkout::PaymentMethodEligibility do
  let(:seller) { create(:user) }

  describe ".for_seller" do
    context "when the seller has the stripe_payment_element flag" do
      before { Feature.activate_user(:stripe_payment_element, seller) }
      after { Feature.deactivate_user(:stripe_payment_element, seller) }

      it "enables the Payment Element lane, card-only, with no fallback reason" do
        result = described_class.for_seller(seller)

        expect(result.payment_element_enabled).to eq(true)
        expect(result.allowed_payment_method_types).to eq(["card"])
        expect(result.fallback_reason).to be_nil
      end
    end

    context "when the seller lacks the flag" do
      it "falls back to card-only with a reason" do
        result = described_class.for_seller(seller)

        expect(result.payment_element_enabled).to eq(false)
        expect(result.allowed_payment_method_types).to eq(["card"])
        expect(result.fallback_reason).to eq("flag_off")
      end
    end
  end
end
