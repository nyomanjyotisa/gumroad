# frozen_string_literal: true

require "spec_helper"

describe Onetime::RestorePartialPaypalDisputeAccess do
  let(:seller) { create(:user) }
  let(:product) { create(:product, user: seller) }

  def build_stuck_purchase(overrides = {})
    purchase = build(
      :purchase,
      link: overrides.delete(:link) { product },
      seller:,
      price_cents: 100,
      total_transaction_cents: 100,
      fee_cents: 30,
      purchase_state: "successful",
      succeeded_at: Time.current,
      chargeback_date: 1.day.ago,
      stripe_partially_refunded: true,
      stripe_refunded: false,
      chargeback_reversed: false,
      charge_processor_id: PaypalChargeProcessor.charge_processor_id,
      **overrides,
    )
    purchase.save!(validate: false)
    purchase
  end

  describe ".process" do
    it "restores access for eligible purchases listed in PURCHASE_IDS" do
      stuck = build_stuck_purchase
      stub_const("#{described_class}::PURCHASE_IDS", [stuck.id].freeze)

      result = described_class.process

      expect(stuck.reload.chargeback_reversed).to be(true)
      expect(result[:restored]).to eq(1)
      expect(result[:skipped_state_drifted]).to eq(0)
    end

    it "skips purchases whose state has drifted" do
      drifted_fully_refunded = build_stuck_purchase(stripe_partially_refunded: false, stripe_refunded: true)
      drifted_already_reversed = build_stuck_purchase(chargeback_reversed: true)
      drifted_unrefunded = build_stuck_purchase(stripe_partially_refunded: false)
      drifted_wrong_processor = build_stuck_purchase(charge_processor_id: StripeChargeProcessor.charge_processor_id)

      stub_const(
        "#{described_class}::PURCHASE_IDS",
        [drifted_fully_refunded.id, drifted_already_reversed.id, drifted_unrefunded.id, drifted_wrong_processor.id].freeze
      )

      result = described_class.process

      expect(drifted_fully_refunded.reload.chargeback_reversed).to be(false)
      expect(drifted_unrefunded.reload.chargeback_reversed).to be(false)
      expect(drifted_wrong_processor.reload.chargeback_reversed).to be(false)
      expect(result[:restored]).to eq(0)
      expect(result[:skipped_state_drifted]).to eq(4)
    end

    it "cascades chargeback_reversed to bundle product purchases" do
      bundle_product = create(:product, :bundle, user: seller)
      bundle_purchase = build_stuck_purchase(link: bundle_product)
      stub_const("#{described_class}::PURCHASE_IDS", [bundle_purchase.id].freeze)
      expect_any_instance_of(Purchase).to receive(:mark_product_purchases_as_chargeback_reversed!)

      described_class.process
    end

    it "supports dry-run mode without writing" do
      stuck = build_stuck_purchase
      stub_const("#{described_class}::PURCHASE_IDS", [stuck.id].freeze)

      result = described_class.process(dry_run: true)

      expect(stuck.reload.chargeback_reversed).to be(false)
      expect(result[:would_restore]).to eq(1)
      expect(result[:restored]).to eq(0)
    end

    it "includes additional_ids opt-in beyond PURCHASE_IDS" do
      baseline = build_stuck_purchase
      opt_in = build_stuck_purchase
      stub_const("#{described_class}::PURCHASE_IDS", [baseline.id].freeze)

      described_class.process(additional_ids: [opt_in.id])

      expect(baseline.reload.chargeback_reversed).to be(true)
      expect(opt_in.reload.chargeback_reversed).to be(true)
    end

    it "is idempotent — re-running does not change already-restored records" do
      stuck = build_stuck_purchase
      stub_const("#{described_class}::PURCHASE_IDS", [stuck.id].freeze)

      described_class.process
      expect(stuck.reload.chargeback_reversed).to be(true)

      result = described_class.process
      expect(result[:restored]).to eq(0)
      expect(result[:skipped_state_drifted]).to eq(1)
    end
  end
end
