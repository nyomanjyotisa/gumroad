# frozen_string_literal: true

FactoryBot.define do
  factory :subtitle_file do
    product_file
    url { "https://s3.ap-southeast-2.amazonaws.com/gumroad-specs/#{SecureRandom.hex}.srt" }
    language { "English" }
  end
end
