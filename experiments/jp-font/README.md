# 日本語フォント表示の確認

TRMNL の Private Plugin（Liquid テンプレート）で、日本語がどう描画されるかを確かめる実験です。

## 再現方法

```sh
bin/trmnl-render experiments/jp-font 1                          # 既定のフォールバック、1-bit
TRMNLP_FONT_FALLBACK=ja bin/trmnl-render experiments/jp-font 2  # fallbacks-ja.css、2-bit
```

描画には `docker/trmnl-render` のイメージを使います。trmnlp v0.32.1（Firefox ESR と ImageMagick）に、TRMNL の描画サーバーと同じ Noto Sans CJK を入れたものです。

## 結果（2026-10-22、TRMNL Framework latest = 3.4.x）

`results/` の画像は上から default/1-bit、ja/1-bit、default/2-bit、ja/2-bit の順です。拡大版は `zoom-comparison.png` です。

- **日本語は表示される**
  - TRMNL のピクセルフォントには、かなも漢字も入っていません。
  - フレームワークの CSS が、足りない文字だけを Noto Sans CJK で補います。
  - 文字化けや豆腐（□）は出ませんでした。
- **既定のままだと、漢字と全角記号が中国語（簡体字）の字形になる**
  - かなは JP フォントで描かれますが、漢字（U+4E00-9FFF）と全角記号（U+3001-303F、U+FF00-FFEF）は `Noto Sans CJK SC` で描かれます。
  - いちばん目立つのは、全角コロン「：」が左寄りになることです。
  - `<link rel="stylesheet" href="https://trmnl.com/fonts/fallbacks-ja.css">` を読み込むと、すべて `Noto Sans CJK JP` になります。**本プロジェクトでは必ず読み込みます。**
- **1-bit では小さい文字の画がつぶれる**
  - `description` と `label--small`（およそ 16px 以下）では、画が抜けました。
    - 例：「千」が「〒」のように見える
    - 例：「写真」の画が欠ける
  - 2-bit（4 階調）ならアンチエイリアスが残り、読めます。
  - 対策は次のどちらかです。
    - 2-bit で描画する（OG は FW 1.6.0 以降で対応）
    - 1-bit のまま、日本語は `title` 以上の大きさで書く

## 注意

本番の描画サーバーと同じフォント名、ブラウザ、量子化処理をそろえた近似です。本番そのものではありません。最終確認は実機で行ってください。
