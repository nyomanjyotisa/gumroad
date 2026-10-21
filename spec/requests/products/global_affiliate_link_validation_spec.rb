# frozen_string_literal: true

require "spec_helper"

describe "Global affiliate link validation", type: :system, js: true do
  let(:seller) { create(:named_seller) }
  before do
    login_as seller
    visit products_affiliated_index_path(affiliates: true)
  end

  it "rejects lookalike hosts and unrelated suffixes" do
    ["https://not#{ROOT_DOMAIN}/l/example", "https://#{ROOT_DOMAIN.split(':').first}.example.org/l/example"].each do |url|
      fill_in "Paste a destination page URL", with: url
      click_on "Generate link"
      expect(page).to have_text('Invalid URL. Make sure your URL is a Gumroad URL and starts with "http" or "https".')
      expect(page).not_to have_text("/l/example?a=")
    end
  end

  it "rejects FTP even when the destination has a genuine Gumroad host" do
    fill_in "Paste a destination page URL", with: "ftp://#{ROOT_DOMAIN}/l/example"
    click_on "Generate link"
    expect(page).to have_text("Invalid URL. Make sure your URL is a Gumroad URL")
    expect(page).not_to have_text("/l/example?a=")
  end

  it "preserves HTTP destinations, query parameters and fragments on genuine hosts" do
    ["http://#{ROOT_DOMAIN}", "https://creator.#{ROOT_DOMAIN}", "https://#{SHORT_DOMAIN}"].each do |host|
      fill_in "Paste a destination page URL", with: "#{host}/l/example?offer_code=sale#details"
      click_on "Generate link"
      expect(page).to have_text("#{host}/l/example?offer_code=sale&a=#{seller.global_affiliate.external_id_numeric}#details")
      expect(page).not_to have_text("Invalid URL. Make sure your URL is a Gumroad URL")
    end
  end
end
