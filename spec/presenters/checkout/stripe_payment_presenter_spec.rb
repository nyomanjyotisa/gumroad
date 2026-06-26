# frozen_string_literal: true

describe Checkout::StripePaymentPresenter do
  def checkout_product_for(product, price: product.price_cents, recurrence: nil, pay_in_installments: false)
    {
      product: {
        creator: { id: product.user.external_id },
        is_preorder: product.is_in_preorder_state,
        free_trial: product.free_trial_enabled ? { duration: { unit: "day", amount: 1 } } : nil,
        native_type: product.native_type,
      },
      price:,
      recurrence:,
      pay_in_installments:,
    }
  end

  def stripe_payment_props(cart: nil, add_products: [], clear_cart: false, saved_credit_card: nil)
    described_class.new(cart:, add_products:, clear_cart:, saved_credit_card:).props
  end

  it "selects Stripe Payment Element for a flagged single-seller charged checkout without a saved card" do
    seller = create(:user)
    product = create(:product, user: seller, price_cents: 1234)
    Feature.activate_user(described_class::STRIPE_PAYMENT_ELEMENT_CHECKOUT_FEATURE_NAME, seller)

    expect(stripe_payment_props(add_products: [checkout_product_for(product)])).to eq(
      integration: described_class::STRIPE_PAYMENT_ELEMENT_INTEGRATION,
      fallback_reason: nil,
      elements_options: {
        mode: "payment",
        currency: "usd",
        payment_method_types: ["card"],
        payment_method_creation: "manual",
      },
    )
  end

  it "selects Stripe Payment Element even when the buyer has a saved card" do
    seller = create(:user)
    product = create(:product, user: seller, price_cents: 1234)
    Feature.activate_user(described_class::STRIPE_PAYMENT_ELEMENT_CHECKOUT_FEATURE_NAME, seller)
    saved_credit_card = { type: "visa", number: "**** **** **** 4242", expiration_date: "12/30", requires_mandate: false }

    expect(stripe_payment_props(add_products: [checkout_product_for(product)], saved_credit_card:)).to eq(
      integration: described_class::STRIPE_PAYMENT_ELEMENT_INTEGRATION,
      fallback_reason: nil,
      elements_options: {
        mode: "payment",
        currency: "usd",
        payment_method_types: ["card"],
        payment_method_creation: "manual",
      },
    )
  end

  it "falls back to CardElement when the Stripe Payment Element seller flag is disabled" do
    product = create(:product, price_cents: 1234)

    expect(stripe_payment_props(add_products: [checkout_product_for(product)])).to eq(
      integration: described_class::STRIPE_CARD_ELEMENT_INTEGRATION,
      fallback_reason: "stripe_payment_element_flag_disabled",
      elements_options: nil,
    )
  end

  it "falls back to CardElement for multi-seller carts" do
    cart = create(:cart, :guest)
    products = [
      create(:product, user: create(:user), price_cents: 100),
      create(:product, user: create(:user), price_cents: 200),
    ]
    products.each do |product|
      Feature.activate_user(described_class::STRIPE_PAYMENT_ELEMENT_CHECKOUT_FEATURE_NAME, product.user)
      create(:cart_product, cart:, product:)
    end

    expect(stripe_payment_props(cart:)).to eq(
      integration: described_class::STRIPE_CARD_ELEMENT_INTEGRATION,
      fallback_reason: "multi_seller_cart",
      elements_options: nil,
    )
  end
end
