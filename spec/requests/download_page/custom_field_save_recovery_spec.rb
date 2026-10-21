# frozen_string_literal: true

require "spec_helper"

describe "Post-purchase response save recovery", type: :system, js: true do
  [
    [CustomField::TYPE_TEXT, RichContent::SHORT_ANSWER_NODE_TYPE],
    [CustomField::TYPE_LONG_TEXT, RichContent::LONG_ANSWER_NODE_TYPE]
  ].each do |field_type, node_type|
    it "retries the unchanged #{field_type} answer after a failed save" do
      product = create(:product)
      purchase = create(:free_purchase, link: product)
      redirect = create(:url_redirect, link: product, purchase:)
      field = create(:custom_field, field_type:, name: "Response", seller: product.user, products: [product], is_post_purchase: true)
      create(:product_rich_content, entity: product, description: [{ "type" => node_type, "attrs" => { "id" => field.external_id, "label" => "Response" } }])
      visit redirect.download_page_url
      page.execute_script <<~JS
        const original=window.fetch;
        window.failNextResponseSave=true;
        window.fetch=(url, options)=>{
          if(String(url).includes('purchase_custom_fields') && window.failNextResponseSave){
            window.failNextResponseSave=false;
            return Promise.resolve(new Response(null,{status:500}));
          }
          return original(url,options);
        };
      JS
      input = find_field("Response")
      input.fill_in with: "My answer"
      input.native.send_keys(:tab)
      expect(page).to have_alert(text: "Your response could not be saved. Please try again.")
      expect(page).to have_field("Response", with: "My answer", disabled: false)
      expect(purchase.purchase_custom_fields.count).to eq(0)
      input.click
      input.native.send_keys(:tab)
      expect(page).to have_alert(text: "Response saved!")
      expect(purchase.purchase_custom_fields.reload.find_by!(custom_field_id: field.id).value).to eq("My answer")
    end
  end
end
