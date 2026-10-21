# frozen_string_literal: true

require "spec_helper"

Capybara.register_driver :review_modes_chrome do |app|
  options = Selenium::WebDriver::Chrome::Options.new
  if ENV["IN_DOCKER"] == "true"
    docker_browser_args.each { |arg| options.args << (arg == "--headless" ? "--headless=new" : arg) }
  end
  test_host_resolver_args.each { |arg| options.args << arg }
  origin = "#{PROTOCOL}://seller.#{ROOT_DOMAIN}"
  # The video recorder needs the secure-context media API, as it gets on HTTPS in production.
  options.args << "--unsafely-treat-insecure-origin-as-secure=#{origin}"
  Capybara::Selenium::Driver.new(app, browser: :chrome, options:)
end

describe "Review mode keyboard selection", :js, type: :system do
  include Rails.application.routes.url_helpers

  let(:product) { create(:product, user: create(:named_seller)) }
  let(:buyer) { create(:user) }
  let!(:purchase) { create(:purchase, link: product, purchaser: buyer) }

  before { driven_by :review_modes_chrome }

  it "changes modes with arrows and keeps one mode tab stop without posting a review" do
    login_as(buyer)
    visit product.long_url

    text = find("button[role='radio']", text: "Text review")
    page.execute_script("arguments[0].focus()", text)
    text.send_keys(:arrow_right)
    expect(page).to have_radio_button("Video review", checked: true)
    expect(page.evaluate_script("document.activeElement.textContent")).to eq("Video review")

    page.driver.browser.switch_to.active_element.send_keys(:arrow_down)
    expect(page).to have_radio_button("Text review", checked: true)
    page.driver.browser.switch_to.active_element.send_keys(:end)
    expect(page).to have_radio_button("Video review", checked: true)
    page.driver.browser.switch_to.active_element.send_keys(:home)
    expect(page).to have_radio_button("Text review", checked: true)

    page.driver.browser.switch_to.active_element.send_keys(:tab)
    expect(page.evaluate_script("document.activeElement.tagName")).to eq("TEXTAREA")
    page.driver.browser.switch_to.active_element.send_keys([:shift, :tab])
    expect(page.evaluate_script("document.activeElement.textContent")).to eq("Text review")
    expect(purchase.reload.original_product_review).to be_nil
  end
end
