# 日本語フォント実機比較

TRMNL OG の実機で、日本語のフォント・太さ・字の大きさ・1-bit/2-bit を見比べるためのテスト用 Private Plugin です。データは取得しません（static）。

## 設定項目（TRMNL のプラグイン設定画面で切り替え）

| 項目 | 選択肢 |
|---|---|
| フォント | TRMNL 標準（日本語字形）/ Noto Sans JP / BIZ UDPGothic / DotGothic16 |
| 太さ | 標準 / 太字（DotGothic16 は標準のみ） |
| ページ | 文字サイズ比較（14〜32px）/ ダッシュボード例 |

どのフォントを選んでも `fallbacks-ja.css` を読み込みます。中国語の字形にはなりません。画面の右下には、選んでいるフォント、太さ、ページが表示されます。

## TRMNL への登録

API キーは TRMNL のアカウント設定にあります。

```sh
TRMNL_API_KEY=user_xxx bin/trmnlp plugins/device-font-test push
```

初回の push で TRMNL 側に Private Plugin ができます。続けて次の作業をします。

1. TRMNL が `src/settings.yml` に書き込んだ `id` をコミットします。
2. プレイリストにこのプラグインを追加します。

## 実機での比較手順

1. 端末のプロファイルを白黒 2 色（`og_png`）にして、各フォントの「文字サイズ比較」と「ダッシュボード例」を見ます。
2. プロファイルを 4 階調グレー（`og_plus`）に切り替えて、同じものを見ます。4 階調グレーにはファームウェア 1.6.0 以降が必要です。
3. 次の点を確かめます。
   - 読める最小の字の大きさ
   - 線のつぶれやかすれ
   - グレーの濃さ
   - Google Fonts が間に合っているか（間に合っていないと、TRMNL 標準のフォントで表示されます）

端末のプロファイルを切り替える画面の場所は、まだ確認していません。

## ローカルでのプレビュー

```sh
TRMNLP_FONT=noto TRMNLP_WEIGHT=700 TRMNLP_PAGE=dashboard bin/trmnl-render plugins/device-font-test 2
```

`plugins/device-font-test/_build/full.png` に出力されます。
