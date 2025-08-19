# frozen_string_literal: true

require "spec_helper"
require "shared_examples/sellers_base_controller_concern"
require "shared_examples/authorize_called"

describe ProductDuplicatesController do
  it_behaves_like "inherits from Sellers::BaseController"

  let(:seller) { create(:named_seller) }
  let(:product) { create(:product, user: seller) }
  let(:file_params) do
    [
      { external_id: SecureRandom.uuid, url: "https://s3.amazonaws.com/gumroad-specs/attachment/pencil.png" },
      { external_id: SecureRandom.uuid, url: "https://s3.amazonaws.com/gumroad-specs/attachment/manual.pdf" }
    ]
  end

  include_context "with user signed in as admin for seller"

  before do
    product.save_files!(file_params)
  end

  def create_products_in_bulk(user, count)
    unique_permalink_chars = ("a".."z").to_a
    rows = Array.new(count) do |i|
      FactoryBot.build(
        :product,
        user: user,
        created_at: Time.current,
        updated_at: Time.current,
        unique_permalink: "product-#{i}-#{SecureRandom.alphanumeric(5)}",
      ).attributes
    end

    Link.insert_all(rows)
  end

  describe "POST create", :enforce_product_creation_limit do
    it_behaves_like "authorize called for action", :post, :create do
      let(:request_params) { { id: product.unique_permalink } }
      let(:record) { product }
      let(:policy_klass) { ProductDuplicates::LinkPolicy }
    end

    context "when user exceeds daily product creation limit" do
      let!(:non_compliant_user) { create(:user, user_risk_state: "not_reviewed") }
      let!(:product) { create(:product, user: non_compliant_user) }

      before do
        create_products_in_bulk(non_compliant_user, 10)
        sign_in(non_compliant_user)
      end

      it "returns an error message" do
        post :create, params: { id: product.unique_permalink }

        expect(response.parsed_body).to eq({
          "success" => false,
          "error_message" => "Sorry, you can only create 10 products per day."
        })
      end

      it "does not enqueue DuplicateProductWorker" do
        expect(DuplicateProductWorker).not_to receive(:perform_async)

        post :create, params: { id: product.unique_permalink }
      end
    end

    it "returns 404 when the id parameter is missing" do
      expect do
        post :create
      end.to raise_error(ActionController::RoutingError)
    end

    it "returns 404 when the id parameter is not the correct identifier for a product" do
      expect do
        post :create, params: { id: "invalid" }
      end.to raise_error(ActionController::RoutingError)
    end

    it "returns success when the id parameter is the correct identifier for a product" do
      post :create, params: { id: product.unique_permalink }

      expect(product.reload.is_duplicating).to be(true)
      expect(response.parsed_body["success"]).to be(true)
      expect(response.parsed_body).not_to have_key("error_message")
    end

    it "returns an error message when the product is already duplicating" do
      product.update!(is_duplicating: true)

      post :create, params: { id: product.unique_permalink }

      expect(response.parsed_body).to eq({ success: false, error_message: "Duplication in progress..." }.as_json)
    end

    it "queues DuplicateProductWorker when the id parameter is the correct identifier for a product" do
      post :create, params: { id: product.unique_permalink }

      expect(DuplicateProductWorker).to have_enqueued_sidekiq_job(product.id)
    end

    it "returns error_message when the current user is not the creator of the product" do
      different_user = create(:user)
      sign_in(different_user)
      expect do
        post :create, params: { id: product.unique_permalink }
      end.to raise_error(ActionController::RoutingError)
    end
  end

  describe "GET show" do
    before do
      product.update!(is_duplicating: false)
    end

    it_behaves_like "authorize called for action", :get, :show do
      let(:request_params) { { id: product.unique_permalink } }
      let(:record) { product }
      let(:policy_klass) { ProductDuplicates::LinkPolicy }
    end

    it "returns an error message when the product is still duplicating" do
      product.update!(is_duplicating: true)

      get :show, params: { id: product.unique_permalink }

      expect(response.parsed_body).to eq({ success: false, status: ProductDuplicatorService::DUPLICATING, error_message: "Duplication in progress..." }.as_json)
    end

    it "returns an error message when the product is not duplicating or recently duplicated" do
      expect(ProductDuplicatorService.new(product.id).recently_duplicated_product).to be(nil)

      get :show, params: { id: product.unique_permalink }

      expect(response.parsed_body).to eq({ success: false, status: ProductDuplicatorService::DUPLICATION_FAILED }.as_json)
    end

    it "successfully returns a recently duplicated product" do
      duplicated_product = ProductDuplicatorService.new(product.id).duplicate
      duplicated_product = DashboardProductsPagePresenter.new(
        pundit_user: SellerContext.new(user: user_with_role_for_seller, seller:),
        memberships: [],
        memberships_pagination: nil,
        products: [duplicated_product],
        products_pagination: nil
      ).page_props[:products].first

      get :show, params: { id: product.unique_permalink }

      expect(response.parsed_body).to eq({ success: true,
                                           status: ProductDuplicatorService::DUPLICATED,
                                           product:,
                                           duplicated_product:,
                                           is_membership: false }.as_json)
    end
  end
end
