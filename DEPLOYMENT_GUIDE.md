# DEPLOYMENT_GUIDE

## 前提の確認

現在の状態（2026-11-20 時点）:

| 項目 | 状態 |
| --- | --- |
| 本番ビルド | 成功 |
| ローカル本番サーバー | 動作確認済み（`npm run start`） |
| `GEMINI_API_KEY` | **未保有**。脚本モードで完走する |
| GitHub CLI | 認証済み（`yumamotose-droid`） |
| GitHub リポジトリ | **未作成**（本人の操作が必要） |
| Vercel CLI | **未インストール** |
| Vercel プロジェクト | **未作成**（本人の操作が必要） |
| Supabase CLI | インストール済み（v2.122.0）。プロジェクトは未作成・不要 |

> 新規アカウント作成、課金、外部への公開は本人の操作が必要です。
> 以下はその手順であり、実行済みという意味ではありません。

## ローカルで動かす

```bash
npm install
npm run dev
```

<http://localhost:3000/deliberate?demo=1> でキーなしの完走を確認できます。

本番相当で確認する場合:

```bash
npm run build
npm run start -- --port 3100
```

## Gemini API に接続する（任意）

1. <https://aistudio.google.com/apikey> でキーを発行する。
2. `.env.local` に書く。

```bash
cp .env.example .env.local
# GEMINI_API_KEY=... を記入
```

3. 再起動し、`/api/health` が `"geminiConfigured": true` を返すことを確認する。
4. 画面右上のバッジが「ライブ生成」になる。

モデルを変える場合は `GEMINI_MODEL` を設定します（既定 `gemini-3.8-flash`）。

> **ライブ実行は未検証です。** 初回は必ず `/deliberate` で1件流し、
> 検証記録の `存在せず削除した出典` と `格下げ` の件数を確認してください。
> ここが0でない場合、モデルが実在しない出典を作ろうとしたことを意味します
> （システムはそれを止めますが、頻度は把握しておくべき情報です）。

## GitHub に置く

```bash
git init -b main
git add -A
git commit -m "FUTURE WITNESS: initial"
```

```bash
gh repo create future-witness --private --source=. --remote=origin --push
```

`.gitignore` により `.env.local`、`node_modules`、`.next`、
`artifacts/playwright-report`、`artifacts/playwright-results` は除外されます。
**`artifacts/screenshots` は証跡として意図的に含めています。**

公開リポジトリにする前に、`git log -p | grep -i "AIza\|sk-\|SUPABASE"` で
鍵の混入がないことを確認してください。

## Vercel にデプロイする

```bash
npm i -g vercel
```

```bash
vercel login
```

```bash
vercel link
```

環境変数を設定します（**値はシェル履歴に残さず、対話入力で**）。

```bash
vercel env add GEMINI_API_KEY production
```

```bash
vercel --prod
```

### Vercel 側の注意

- `/api/deliberate` は SSE で最大 `maxDuration = 120` 秒を宣言しています。
  **Hobby プランの上限を超える場合があります。** 超える場合は
  `BUDGET.maxRunMs`（`src/lib/security/budget.ts`）を下げてください。
- `RATE_LIMIT_CAPACITY` は **設定しないでください**。
  設定されている場合 `/api/health` が `rateLimit.overridden: true` を返します。
- レート制限はインスタンス内メモリです。複数リージョン配備では
  共有ストアへの置換が必要です（`SECURITY.md` 参照）。

デプロイ後の確認:

```bash
curl -s https://<your-domain>/api/health
```

`geminiConfigured`、`corpus.sources`、`rateLimit.overridden` を目視してください。

## Supabase を使う（任意・既定では不要）

既定ではサーバーに何も保存しません。保存したい場合のみ:

1. Supabase プロジェクトを作成する（本人の操作）。
2. `supabase/schema.sql` を適用する。
   **RLS が有効化され、ポリシーは作られません**（anon キーでは読み書き不可）。
3. `SUPABASE_URL` と `SUPABASE_SERVICE_ROLE_KEY` をサーバー環境変数に設定する。
4. `src/lib/store/supabase.ts` を UI に接続する（既定では未接続）。

保存する前に、`SECURITY.md` の「データ最小化」を読んでください。
これは「争点のある決定に対する個人の立場」の記録です。

## デプロイナウ（併願する場合）

`CONTEST_STRATEGY.md` のとおり、ロリポップ！デプロイナウでの公開が応募条件です。
**Next.js のサーバー機能（SSE ルート）が動作するかは未確認です。**
動作しない場合、脚本モード専用の静的構成（`output: "export"` ＋
サーバールートの切り離し）という別ビルドが必要になります。
現状のコードベースのままでは動かない可能性が高い、というのが正直な見込みです。

## iCloud Drive 上で作業する場合の注意

このプロジェクトは iCloud Drive 配下にあります。観測した問題が二つあります。

**1. `.next` の同期衝突で重複ファイルが生成される。**
`routes.d 2.ts` のようなファイルができ、型チェックが `Duplicate identifier` で落ちます。

**2. 増分ビルドが古いCSSを配信することがある。**
`globals.css` を変更して `npm run build` を実行しても、
Turbopack の永続キャッシュが更新を取りこぼし、**古い CSS チャンクが配信されました**。
iCloud の mtime の扱いがキャッシュの無効化判定と噛み合っていないことが原因と見られます。

どちらも `.next` の削除で解消します。

```bash
npm run clean
```

`rm: .next: Directory not empty` で失敗する場合（同期中に起きます）、
一度リネームしてから消してください。

```bash
mv .next .next-stale && rm -rf .next-stale
```

**スタイルを変更したあとは、増分ビルドを信用せず、配信されている CSS を確認してください。**

```bash
curl -s http://127.0.0.1:3100/deliberate | grep -o '/_next/static/[^"]*\.css'
```
