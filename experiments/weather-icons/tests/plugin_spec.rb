# frozen_string_literal: true

# Run with `bin/trmnlp experiments/weather-icons test --update` to redraw tests/snapshots.
RSpec.describe '天気アイコン一覧' do
  it 'draws every icon' do
    expect(trmnl.render(device: 'og_png', orientation: :portrait)).to match_snapshot('icons')
  end
end
