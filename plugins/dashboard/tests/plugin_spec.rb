# frozen_string_literal: true

# Run with `bin/trmnlp plugins/dashboard test`; `test --update` re-records tests/snapshots.
# The weather comes from ../jma-weather's last fetched data and the events from fixtures/google-calendar
# (see merged_plugins in .trmnlp.yml).
RSpec.describe '天気と予定' do
  let(:custom_fields) { { 'weather_source' => 'private_plugin_1', 'calendar_source' => 'google_calendar_1' } }

  { 'og_png' => '1-bit', 'og_plus' => '2-bit' }.each do |device, depth|
    it "draws the portrait screen on #{device} (#{depth})" do
      expect(trmnl.render(device:, orientation: :portrait, custom_fields:)).to match_snapshot("portrait-#{device}")
    end
  end
end
