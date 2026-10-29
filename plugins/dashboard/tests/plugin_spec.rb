# frozen_string_literal: true

# Run with `bin/trmnlp plugins/dashboard test`; `test --update` re-records tests/snapshots.
# The weather comes from ../jma-weather's last fetched data and the events from fixtures/google-calendar
# (see merged_plugins in .trmnlp.yml).
RSpec.describe '天気と予定' do
  let(:sources) { { 'weather_source' => 'private_plugin_1', 'calendar_source' => 'google_calendar_1' } }

  # The OG cannot be set to portrait, so the portrait screen is drawn turned on the landscape panel.
  { 'og_png' => '1-bit', 'og_plus' => '2-bit' }.each do |device, depth|
    it "draws the portrait screen turned clockwise on #{device} (#{depth})" do
      expect(trmnl.render(device:, custom_fields: sources.merge('rotation' => 'cw'))).to match_snapshot("rotated-#{device}")
    end
  end

  it 'draws the portrait screen upright on a device set to portrait' do
    expect(trmnl.render(device: 'og_png', orientation: :portrait, custom_fields: sources.merge('rotation' => 'none')))
      .to match_snapshot('portrait-og_png')
  end
end
