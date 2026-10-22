# trmnl-dashboard 設計書

[kindle-wallpaper-jp](https://github.com/ichusrlocalbin/kindle-wallpaper-jp) のような「日本語の天気＋予定の壁紙」を TRMNL に表示する。

## 1. 参考実装との違い

| 項目 | kindle-wallpaper-jp | 本プロジェクト |
|---|---|---|
| 表示端末 | Kindle Paperwhite（脱獄して cron で画像取得） | TRMNL（自分から定期的に画像を取りに行く） |
| 生成サーバ | Raspberry Pi + Docker + systemd | **GitHub Actions**（常時起動のサーバは置かない） |
| 配信 | Pi 上の HTTP サーバ（:8080） | **GitHub Pages** の静的 PNG |
| 言語 | Python | TypeScript（Node 24、`.node-version` に合わせる） |
| 天気 | OpenWeatherMap（API キーが必要） | **気象庁の予報 JSON**（キー不要で、日本語の予報文と降水確率が取れる） |
| 予定 | Google Calendar API（OAuth） | **Google カレンダーの iCal 秘密 URL**（OAuth なし） |

TRMNL は端末側の改造が要らず、「指定した URL の画像を表示する」仕組みを公式に持っている。端末側のスクリプト（`kindle/` 相当）は作らない。

## 2. 全体構成

```
┌──────────────── GitHub Actions（cron: 30分ごと） ────────────────┐
│                                                                  │
│  fetch ──► 気象庁 forecast JSON ─┐                               │
│        └─► Google Calendar iCal ─┤                               │
│                                  ▼                               │
│  render: JSX ──satori──► SVG ──resvg──► PNG ──sharp──► 1bit PNG  │
│                                  │                               │
│  deploy: GitHub Pages へ dashboard.png を publish                 │
└──────────────────────────────────┼───────────────────────────────┘
                                   ▼
             https://<user>.github.io/trmnl-dashboard/dashboard.png
                                   ▲
        TRMNL Cloud（Alias プラグイン）が取得 ──► TRMNL 端末に表示
```

### TRMNL へ渡す方式（比較）

| 方式 | 概要 | 長所 | 短所 |
|---|---|---|---|
| **A. Alias プラグイン + 自前 PNG（採用）** | 自分で作った PNG の URL を TRMNL に登録する | 日本語フォントとレイアウトを完全に自分で決められる。参考実装の考え方に最も近い | 画像は自前で生成する必要がある |
| B. Private Plugin（Liquid テンプレート + Polling） | TRMNL 側が HTML を描画する | TRMNL のデザインシステムを使える。生成処理が要らない | 日本語フォントの描画が TRMNL 側次第。ローカルで確認しにくい |
| C. BYOS（自前サーバ） | TRMNL Cloud を使わず端末を自前サーバへ向ける | 完全に自分で管理できる | 常時起動のサーバが必要。参考実装の Pi 運用に戻ってしまう |

A を採用する。後から B へ移る場合も、`fetch` 層（データ取得）はそのまま使える。

## 3. 画面仕様

- 解像度は **800×480**（TRMNL OG、横向き）
- 色は **1-bit の白黒** を基本にする。2-bit グレー（4 階調）は端末とファームウェアが対応していれば後で切り替える
- フォントは **Noto Sans JP**（Regular と Bold）。リポジトリに同梱する（OFL ライセンス）
- e-ink では細い線とグレーが潰れやすい。線は 2px 以上、文字は 16px 以上にする

### レイアウト案

```
┌────────────────────────────────────────────────────────────────┐
│ 10月22日（木）                                   最終更新 13:30 │
├──────────────────────────┬─────────────────────────────────────┤
│  今日  ☀→☁               │ 今日の予定                          │
│  23° / 14°   降水 20%    │  終日  有給休暇                     │
│  晴れ 夕方から くもり     │  10:00 定例MTG                      │
│                          │  14:00 顧客打ち合わせ               │
│  明日  ☂                 │                                     │
│  19° / 13°   降水 70%    │ 明日の予定                          │
│  雨 昼過ぎから やむ       │  09:30 歯医者                       │
├──────────────────────────┴─────────────────────────────────────┤
│ 週間  金 ☀ 22/12 │ 土 ☁ 20/13 │ 日 ☂ 18/12 │ 月 ☀ 21/11 │ …    │
└────────────────────────────────────────────────────────────────┘
```

- 左ペインは今日と明日の天気。気象庁の予報文（例：「晴れ 夕方から くもり」）をそのまま表示する
- 右ペインは今日と明日の予定。終日予定を先に並べ、収まらない分は「他 N 件」と表示する
- 下段は週間予報
- 天気アイコンは e-ink 向けの単色 SVG を使う（気象庁の天気コードからアイコンへ対応付ける）

## 4. データ取得

### 天気：気象庁

- 予報は `https://www.jma.go.jp/bosai/forecast/data/forecast/{officeCode}.json`
  - `[0]` に 3 日間の天気・降水確率・気温、`[1]` に週間予報が入っている
- 地域コードは設定で持つ（例：東京都 `130000`、地区は `130010`）
- 天気コードとアイコン・文言の対応表は `src/weather/codes.ts` に持つ

### 予定：Google カレンダー iCal

- カレンダー設定にある「iCal 形式の非公開 URL」を **GitHub Secrets** に登録する（`CALENDAR_ICS_URLS`、複数ならカンマ区切り）
- `node-ical` などでパースし、繰り返し予定（RRULE）を展開して、今日と明日の分を抽出する
- タイムゾーンはすべて `Asia/Tokyo` に揃える
- OAuth やサービスアカウントの代わりに iCal を使う理由は、設定が URL 1 つで済み、トークンの更新も要らないから。URL が漏れると予定を読まれるので、Secrets 以外には置かない

## 5. 描画パイプライン

1. `satori`：JSX と Flexbox で書いたレイアウトとフォントから SVG を作る
2. `@resvg/resvg-js`：SVG を 800×480 の PNG にラスタライズする
3. `sharp`：グレースケール化し、しきい値で 1-bit にして PNG を書き出す
   - 文字や線の画面なので、ディザリングではなく **しきい値** で処理する（アイコンもベタ塗りで作る）

ブラウザ（Puppeteer）を使わないので、Actions 上でも速く軽く動く。

## 6. ディレクトリ構成（予定）

```
trmnl-dashboard/
├── .github/workflows/
│   └── render.yml          # cron → build → Pages deploy
├── assets/
│   ├── fonts/NotoSansJP-{Regular,Bold}.ttf
│   └── icons/*.svg         # 天気アイコン（単色）
├── docs/DESIGN.md
├── src/
│   ├── config.ts           # 地域コード、タイムゾーン、表示件数など
│   ├── fetch/
│   │   ├── jma.ts          # 気象庁 → Weather 型
│   │   └── calendar.ts     # iCal → CalendarEvent[]
│   ├── weather/codes.ts    # 天気コード → アイコン・文言
│   ├── render/
│   │   ├── Dashboard.tsx   # レイアウト（satori 用 JSX）
│   │   └── toPng.ts        # SVG → PNG → 1bit
│   └── main.ts             # fetch → render → dist/dashboard.png
├── test/                   # fixture JSON/ICS を使ったスナップショットテスト
├── package.json
└── tsconfig.json
```

- `fetch` と `render` は型（`Weather`、`CalendarEvent`）を境に分ける。`render` は fixture だけで動くようにし、ネットワークなしでレイアウトを確認できるようにする
- `npm run preview` で fixture から `dist/dashboard.png` を作り、手元で確認する

## 7. 更新タイミング

- GitHub Actions の cron は `*/30 * * * *`（UTC 指定。JST へ換算せず 30 分ごとに動かす）
  - Actions の cron は数分から十数分遅れることがある。表示が正確な時刻に依存しないよう、画面には「最終更新」を出す
- TRMNL 側のプラグイン更新間隔も 30 分程度にする。e-ink とバッテリーのため、頻繁な更新は避ける
- 深夜（0〜5 時）は生成をスキップする選択肢も残す

## 8. エラー時の振る舞い

- 天気と予定は **片方が失敗してももう片方を描画する**。失敗した欄には「取得失敗」と表示する
- 両方とも失敗した場合は deploy せず、前回の PNG を残す。Actions は失敗させて通知を受け取る

## 9. 決めておきたいこと（要確認）

1. **端末モデル**：TRMNL OG（800×480）か、TRMNL X（高解像度・多階調）か
2. **地域**：天気を表示する都道府県と地区
3. **カレンダー**：Google カレンダーか。対象は 1 つか複数か
4. **表示項目の追加**：時刻、ゴミ出し曜日、祝日、六曜、為替・株価など
5. **ホスティング**：GitHub Pages（public リポジトリが前提。private の場合は有料プランが必要）でよいか。代わりに Vercel や Cloudflare（Cron + R2）も使える
6. **公開範囲**：PNG の URL を知っていれば誰でも予定が見える。推測されにくいパス（例：`/<ランダム文字列>/dashboard.png`）にするか、予定の表示をタイトルだけにするか
