# 日本語フォント候補の比較

1-bit の TRMNL OG で小さい日本語がつぶれる問題（[../jp-font](../jp-font)）への対策として、Google Fonts から読み込める日本語フォントを描き比べました。Google Fonts なら TRMNL の本番環境でも `@font-face` で読み込めます。

```sh
bin/trmnl-render experiments/jp-font-candidates 1
bin/trmnl-render experiments/jp-font-candidates 2
```

すべての行で `fallbacks-ja.css` を読み込んでいます。Web フォントの読み込みに失敗しても、中国語の字形（Noto Sans CJK SC）にはならず、日本語の字形で表示されます。

## 結果（1-bit、16px）

`results/16px-1bit-zoom.png` は上から次の順です。

| フォント | 評価 |
|---|---|
| Noto Sans JP 400 | 線が細く、「誤」「率」の画が抜ける |
| Noto Sans JP 700 | 「誤」「確」が黒くつぶれる |
| **BIZ UDPGothic 400** | 字の中がよく開いていて、画が残る。いちばん読みやすい |
| BIZ UDPGothic 700 | 読める。見出しに使える。「確」はやや詰まる |
| DotGothic16 | 16px のドットにぴったり合うので、くっきり表示される。ただし画数の多い字は略字のようになり、レトロな見た目になる |

20px 以上なら、どのフォントも 1-bit で読めます。

## 結果（2-bit、16px）

`results/16px-2bit-zoom.png` の並び順は、1-bit の表と同じです。

- 2-bit では輪郭がグレーでなめらかになるので、どのフォントも 1-bit より読みやすくなります。
- フォントの違いより、**1-bit か 2-bit かの違いの方がずっと大きい**です。
- 1-bit で黒くつぶれていた Noto Sans JP 700 も、2-bit なら読めます。

## 結論

- **2-bit で描画する**。OG は FW 1.6.0 以降で対応している
- フォントは BIZ UDPGothic か Noto Sans JP にする。どちらの場合も `fallbacks-ja.css` を読み込む
- 本文は 16px 以上にする
- 実機で、Google Fonts の読み込みが描画に間に合うかを確認する
