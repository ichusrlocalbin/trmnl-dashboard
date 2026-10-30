# trmnl-dashboard 設計書

[kindle-wallpaper-jp](https://github.com/ichusrlocalbin/kindle-wallpaper-jp) のような「日本語の天気＋予定の画面」を TRMNL OG に表示する。

- 対象端末は TRMNL OG（800×480、約 124ppi、1-bit または 2-bit グレー）。Developer Edition は購入済み
- 天気は東京都（気象庁の地域コード 130000、地区は東京地方 130010）
- 予定は Google カレンダー 1 つ
- ソースコードは public の GitHub リポジトリに置く（push はユーザーが行う）

## 1. 方式：TRMNL 側で描画する

TRMNL の端末は、受け取った画像を表示するだけの装置。HTML・SVG・フォントを自分では描画できない。そのため、どの方式でも最終的には誰かが画像を作る必要がある。本プロジェクトでは、その画像を **TRMNL のサーバーに作らせる**。

```mermaid
flowchart LR
  subgraph server["TRMNL のサーバー"]
    gcal["Google Calendar<br>公式・非表示<br>OAuth で予定を取得"]
    jma["jma-weather<br>Private Plugin・非表示<br>Polling で気象庁 JSON を取得<br>transform で整形"]
    dash["dashboard<br>Private Plugin<br>Plugin Merge で 2 つのデータを受け取り、<br>Liquid で描画"]
    render["Firefox で描画<br>→ 1-bit / 2-bit PNG"]
    gcal --> dash
    jma --> dash
    dash --> render
  end
  render --> og["TRMNL OG<br>（表示するだけ）"]
```

- **自前のサーバーも、画像の置き場所も要らない**。用意するのは、TRMNL に登録するテンプレートと設定だけ
- このリポジトリには、そのテンプレートと設定（trmnlp プロジェクト）を置く
- 登録は `bin/trmnlp <dir> push` で行う

### プラグインを 3 つに分ける理由

Private Plugin は、データの取得方法（strategy）を 1 つしか選べない。天気は「Polling」、予定は「Plugin Merge」で取るので、1 つのプラグインにまとめられない。そこで、Plugin Merge を使う表示用プラグイン（`dashboard`）が、次の 2 つのデータを受け取って 1 画面に描く。

| プラグイン | 種類 | strategy | 役割 | プレイリスト |
|---|---|---|---|---|
| Google Calendar | 公式 | ― | 予定を取得する | 非表示 |
| `jma-weather` | Private | polling | 気象庁から天気を取り、transform で整形する | 非表示 |
| `dashboard` | Private | plugin_merge | 上の 2 つのデータを受け取り、画面を描く | **表示** |

非表示のプラグインでも、Plugin Merge から参照されていればデータは更新される（公式ドキュメントに記載あり）。

### 検討して採用しなかった案

| 案 | 採用しなかった理由 |
|---|---|
| 自分で PNG を作り、Alias プラグインで表示する | 生成と配信の仕組み（GitHub Actions、Pages など）が要る。日本語の表示は TRMNL 側でも問題ないことを確認した（`experiments/jp-font`） |
| 公式の Google Calendar・天気プラグインをそのまま並べる（Mashup） | `fallbacks-ja.css` を読み込めないので漢字が中国語の字形になる。表示も一部英語のまま。天気は気象庁のデータではない |
| iCal を Polling し、transform で解析する | 繰り返し予定の展開を自分で書く必要がある。Google の OAuth を TRMNL に任せる方が簡単 |
| BYOS（自前サーバー） | 常時動かすサーバーが必要になる |

## 2. 表示仕様

### 日本語フォント（`experiments/` での検証結果）

- **`fallbacks-ja.css` を必ず読み込む**。読み込まないと、漢字と全角記号が Noto Sans CJK **SC**（中国語の字形）で描かれる
- 本文のフォントは BIZ UDPGothic（Google Fonts）を第一候補とする。読み込みに失敗しても、TRMNL 標準のフォントに日本語の字形で戻る
- 1-bit では 16px 以下の字の画がつぶれる。本文は 20px 前後、最小でも 16px にする
- **1-bit か 2-bit か、フォント、最小の字の大きさは、実機で決める**（`plugins/device-font-test`）

### 画面の向き

**横向き（800×480）に決めた**。左半分に明日の天気を大きく出し、右上に予定、右下に週間予報を置く。

途中までは縦向き（480×800）で作っていた。TRMNL OG は端末の設定で縦向きにできない（「画面回転は現在、あなたのデバイスではサポートされていません」と表示される）ため、テンプレートの中で CSS で 90 度回して描いていた。最終的には、本体背面にある横向き用の壁掛け穴（上がとがった三角形）を使えるよう、横向きのレイアウトに変えた。

以下は検討時の画面案で、最終的なレイアウトは `plugins/dashboard/tests/snapshots/linux/landscape-og_png.png` を参照。

#### 横向き（800×480）

```
┌──────────────────────────────────────────────────────────┐
│ 10月22日（木）                          東京・13:30 更新 │
├───────────────────────────┬──────────────────────────────┤
│ [☀→☁]  23° / 14°          │ 今日の予定                   │
│ 晴れ 夕方から くもり       │ 終日  有給休暇               │
│ 降水確率 20%              │ 10:00 定例ミーティング       │
│                           │ 明日の予定                   │
│ 明日 [☁/☂] 19°/13° 70%    │ 09:30 顧客打ち合わせ  他2件  │
├───────────────────────────┴──────────────────────────────┤
│ 金[☀]22/12 │ 土[☁]20/13 │ 日[☂]18/12 │ 月[☀]21/11 │ …   │
└──────────────────────────────────────────────────────────┘
```

#### 縦向き（480×800）

```
┌────────────────────────────┐
│ 10月22日（木）  13:30 更新 │
├────────────────────────────┤
│ [☀→☁]   23° / 14°          │
│ 晴れ 夕方から くもり        │
│ 降水確率 20%               │
│ 明日 [☁/☂] 19°/13° 70%     │
├────────────────────────────┤
│ 今日の予定                 │
│ 終日  有給休暇             │
│ 10:00 定例ミーティング     │
│ 14:30 歯医者               │
│ 明日の予定                 │
│ 09:30 顧客打ち合わせ       │
│ 他 2 件                    │
├────────────────────────────┤
│ 金☀ 土☁ 日☂ 月☀ 火☁        │
│ 22/12 20/13 18/12 …        │
└────────────────────────────┘
```

縦向きの方が、予定を多く並べられる。

### 天気アイコン

- 気象庁にもアイコンの SVG があるが（`https://www.jma.go.jp/bosai/forecast/img/{code}.svg`）、カラーなので 1-bit ではディザ（点の模様）になって汚くなる
- 代わりに、**線画の自作 SVG** をテンプレートに直接書き込む。外部の画像は読み込まない。塗りつぶしは黒が強く出すぎるので使わない
- 天気の移り変わりは、新聞の天気記号と同じく「/」（のち）と「|」（時々・一時）で表す
- 気象庁の天気コード（3 桁）は、次のように分類して描く
  - 基本の天気：晴・曇・雨・雪
  - 移り変わり：「のち」「時々」
  - 例：`100` 晴れ、`111` 晴れのちくもり、`203` くもり時々雨
- コードと分類の対応表は `jma-weather` の transform に持たせる

## 3. データ

### 天気：`jma-weather`（polling + transform）

- 取得先は `https://www.jma.go.jp/bosai/forecast/data/forecast/130000.json`。キーは不要
  - `[0]`：3 日分の予報。天気の文章（例：「晴れ　夕方から　くもり」）、天気コード、降水確率（6 時間ごと）、気温
  - `[1]`：週間予報。天気コード、最高・最低気温、降水確率
- 天気の文章には全角スペース（U+3000）が入っている。表示用に半角スペースへ置き換える
- transform（Node）で、画面に必要な形だけに整える。

```json
{
  "updated_at": "2026-10-22T11:00:00+09:00",
  "area": "東京地方",
  "days": [
    { "date": "2026-10-22", "label": "今日", "text": "晴れ 夕方から くもり",
      "icon": { "base": "sunny", "change": "later", "to": "cloudy" },
      "temp_max": 23, "temp_min": 14, "pop": 20 }
  ],
  "week": [ { "date": "2026-10-23", "dow": "金", "icon": { "base": "sunny" }, "temp_max": 22, "temp_min": 12 } ]
}
```

- 気象庁の予報は 1 日 3 回（5 時・11 時・17 時）出る。取り直す間隔は下の「更新の間隔」を参照

### 予定：公式 Google Calendar プラグイン

- TRMNL の画面から Google アカウントに接続し、表示するカレンダーを選ぶ（複数でもよい）。レイアウトは Month にし（6 週間先まで取れる）、プレイリストでは非表示にする
- `dashboard` 側では、設定画面の `calendar_source`（`plugin_instance_select`）で選んだプラグインのデータを受け取る。値がデータではなくプラグインの名前（例：`google_calendar_523434`）で届くこともあるので、そのときは名前で引き直す
- データの形はドキュメントに書かれていないため、Account API（`/api/plugin_settings/<id>/data`）で実データを見て決めた
  - 予定は `events` の配列で、開始時刻の順に並ぶ
  - 各予定は `summary`、`all_day`、`start_full`（例：`2026-10-30T12:00:00.000+09:00`、カレンダーのタイムゾーン付き）、`status` などを持つ。ほかに `start`（`12:00 PM`）、`end_full`、`calname`、`location`、`description` もある
  - 全体には `tz`（例：`Asia/Tokyo`）と `today_in_tz` が付く
- 渡される範囲はレイアウトで決まる。今日の 0 時から、Week などは 7 日後まで、Month・Rolling Month は 42 日後まで、Schedule は 14 日後まで（プラグインのソース `usetrmnl/plugins` の `lib/google_calendar/google_calendar.rb` にある `time_max`）。週の始まりや「週を固定する」設定には左右されない
- 表示は、今日以降で取り消されていない（`status` が `cancelled` でない）予定を、届いた順に最大 5 件。日付・時刻・予定名の表にし、終日の予定は時刻を空欄にする。入りきらない分は表示しない
- ローカルのプレビューでは、同じ形のサンプル（`plugins/dashboard/fixtures/google-calendar`）を使う

### 更新の間隔

間隔は 2 種類あり、設定する場所も、電池への影響も違う。

| 設定 | 場所 | 何の間隔か | 値 |
|---|---|---|---|
| Refresh Rate | 端末の設定（API では端末の `refresh_interval`、秒） | 端末が目を覚まし、画像を取りに来て、画面を書き換える | 2 時間。20:00〜11:00 はスリープモードで止め、最後の表示を残す（スリープ画面は使わない）。左半分は「明日」の天気なので、夜に描いたものが残れば、朝はその日の天気になる |
| Refresh interval | 各プラグインの設定（API ではプラグインの `refresh_interval`、分） | TRMNL のサーバーがデータを取り直し、画像を作り直す。Polling では、データを取りに行く間隔でもある | jma-weather・dashboard：60 分（`src/settings.yml`）。Google Calendar：15 分 |

- 電池に効くのは Refresh Rate だけ。プラグインの間隔はサーバーの中の作業なので、端末は起きない。そのため、プラグインの間隔は Refresh Rate より短くし、端末が起きたときに最新に近い画面を渡す
- 画面の情報は、最大で「プラグインの間隔＋Refresh Rate」（天気でおよそ 3 時間）古くなる。予報は 1 日 3 回なので、これで足りる。17 時の予報は 20 時のスリープまでに反映され、翌朝はそれを見る（5 時の予報は反映されない）
- jma-weather と dashboard の間隔は `settings.yml` が正となる。Web で変えても、`push --force` でファイルの値に戻る

## 4. リポジトリ構成

```
trmnl-dashboard/
├── bin/
│   ├── trmnlp                # trmnlp を本番に近い Docker 環境で実行する
│   └── trmnl-render          # PNG のプレビュー（trmnlp build --png）
├── docker/trmnl-render/      # trmnlp + Noto Sans CJK（本番の描画サーバーと同じフォント）
├── docs/DESIGN.md
├── experiments/              # 日本語フォントの検証（結果は各 README）
└── plugins/
    ├── device-font-test/     # 実機でフォントを比べるためのテスト用プラグイン（作成済み）
    ├── jma-weather/          # 天気（polling + transform）
    │   └── src/{settings.yml, transform.js, full.liquid}   # full.liquid は単体確認用
    └── dashboard/            # 表示（plugin_merge）
        ├── .trmnlp.yml       # merged_plugins にローカルの jma-weather と予定の fixture を指定
        ├── fixtures/         # Google Calendar データのサンプル（実データを見て作る）
        └── src/{settings.yml, shared.liquid, full.liquid}
```

- ローカルでは trmnlp の `merged_plugins` に `jma-weather` と予定の fixture を指定する。こうすると、TRMNL に登録しなくても完成した画面をプレビューできる
- `trmnlp test`（`tests/plugin_spec.rb`）でスナップショットを撮り、次の場面の表示を確認する
  - 予定がない日
  - 予定が多い日
  - 天気の取得に失敗した日

## 5. エラー時の表示

- **天気の取得に失敗した**：TRMNL に残っている前回のデータで描く。データが古い場合は「取得 HH:MM」を目立たせる
- **予定のデータがない**：予定の欄に「予定なし」と表示する。連携が切れているか区別できない場合は、注記を付ける
- **フォントの読み込みに失敗した**：`fallbacks-ja.css` によって、日本語の字形のまま TRMNL 標準のフォントで表示される

## 6. 実装の順番

1. **本体が届いたら**：`device-font-test` で、1-bit か 2-bit か、フォント、最小の字の大きさ、画面の向きを決める
2. `jma-weather`：transform と、単体の確認画面を作る
3. Google Calendar を接続し、実データから fixture を作る
4. `dashboard`：横向きか縦向き（決めた方）のレイアウト、天気アイコン、エラー時の表示を作る
5. 実機で、更新間隔と表示を確認する

## 7. 実機で確認したこと

設計の時点で未確認だったことは、端末が届いてから次のように確かめた。

| 項目 | 結果 |
|---|---|
| 1-bit / 2-bit の切り替え | 端末の設定で切り替える。2-bit はファームウェア 1.6.0 以上が必要。テンプレートは白黒のままでも読めるように作った |
| 画面の向き | OG は縦向きにできない（「画面回転は現在、あなたのデバイスではサポートされていません」）。端末の設定にある Image Rotation（90 / 180 / 270 度）は、画像を回すだけ。そのため横向きのレイアウトにした |
| 本番での Google Fonts | 実機の表示では問題なく読み込まれている。ローカルの描画（trmnlp）では、まれに白い画面になる |
| Google Calendar のデータ | 予定は `events` の配列で、開始時刻の順に並ぶ。各予定は `summary`、`all_day`、`start_full`（例：`2026-10-30T12:00:00.000+09:00`）、`status` などを持つ。ほかに `tz` と `today_in_tz` が付く。範囲はレイアウトで決まる（Week は 7 日後まで、Month は 42 日後まで） |
| transform（Node） | Developer Edition で使える。`jma-weather` の整形は transform で行っている |
| Plugin Merge | 公式プラグインと Private Plugin を同時に参照できる。設定画面の `plugin_instance_select` で選び、選んだ後に**保存しないとデータが渡らない**。Private Plugin のデータは `merge_variables` の下、公式プラグインのデータは直下に入る |
