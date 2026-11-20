# FUTURE WITNESS — 未来の証人

**The Future Has a Voice.**

未来には、まだ声がない。
環境、都市計画、エネルギー、教育。その影響を最も長く受ける人々は、いま意思決定に
参加できない。FUTURE WITNESS は、その非対称性をインターフェースにした審議システムです。

未来を予測しません。現在の選択が開く複数の未来を、**確認できる根拠**と、
**それに対する反証**とともに並べ、**判断はユーザーに返します**。

---

リポジトリ: <https://github.com/yumamotose-droid/future-witness>

## 90秒で確かめる

```bash
npm install
npm run dev
```

ブラウザで <http://localhost:3000/deliberate?demo=1> を開く。
APIキーがなくても完全な審議が最後まで動きます（事前生成モードとして明示されます）。

## これは何が違うのか

「人格を設定したチャットでも未来の人物は演じられる」——そのとおりです。
この四つは演技ではなく機構で成立しています。すべて画面上で確認できます。

| 機構 | 実装 | 画面での確認方法 |
| --- | --- | --- |
| 出典の機械的照合 | `src/lib/evidence/verify.ts` | 検証記録に「照合した出典 / 存在せず削除した出典」が毎回出る |
| 記述単位の認識論的型付け | `Claim.kind` + Zod 検証 | 全文に 証/推/仮/？ のスタンプが付く |
| 判断の事前事後記録 | `StanceForm` × 2 | 「立場の変化」に選択と確信の差分が残る |
| 自己への反証 | `COUNTER` プロンプト | 反証節がこのシステム自身の演出を攻撃する |
| 単一チャットとの比較 | `/api/baseline` | 同じ問いを通常のチャットに投げて並べる |

出典IDがコーパスに存在しなければ、その記述は画面に出る前に「確認された根拠」から
「推論」へ格下げされ、削除件数が検証記録に残ります。これは祈りではなく処理です。

## 動作モード

| モード | 条件 | 表示 |
| --- | --- | --- |
| ライブ生成 | `GEMINI_API_KEY` あり | 右上に「ライブ生成」 |
| 事前生成（脚本） | キーなし／モデル失敗 | 右上に「事前生成」＋理由の注記 |

モックを本番AIとして偽装しません。ライブ実行が途中で失敗した場合も、
以降が脚本に切り替わったことを注記として表示し、検証記録の `mode` は `scripted` になります。

## セットアップ

```bash
cp .env.example .env.local   # GEMINI_API_KEY を入れるとライブ生成になる
npm install
npm run dev
```

| 変数 | 必須 | 既定 |
| --- | --- | --- |
| `GEMINI_API_KEY` | いいえ | なし（脚本モード） |
| `GEMINI_MODEL` | いいえ | `gemini-3.8-flash` |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | いいえ | なし（履歴はブラウザ内のみ） |
| `RATE_LIMIT_CAPACITY` | いいえ | 10（**本番では設定しない**） |

## コマンド

```bash
npm run dev        # 開発サーバー
npm run build      # 本番ビルド
npm run start      # 本番サーバー
npm run lint       # ESLint（警告ゼロ必須）
npm run typecheck  # tsc --noEmit
npm run test       # Vitest 単体テスト
npm run test:e2e   # Playwright（本番ビルドに対して実行）
npm run verify     # 上記をまとめて実行
```

## 技術構成

Next.js 16 (App Router) / React 19 / TypeScript / Tailwind CSS v4 /
Zod 4 / `@google/genai` / Server-Sent Events / Web Speech API /
Vitest / Playwright。

AIプロバイダーは `src/lib/ai/provider.ts` の二メソッドだけに依存しているため、
Claude や OpenAI への差し替えはアダプタ1ファイルで済みます。

## ドキュメント

| ファイル | 内容 |
| --- | --- |
| [ARCHITECTURE.md](ARCHITECTURE.md) | 構成とデータフロー |
| [PRODUCT_SPEC.md](PRODUCT_SPEC.md) | 要件と体験設計 |
| [AI_AGENT_SPEC.md](AI_AGENT_SPEC.md) | 4エージェントの仕様 |
| [DATA_SOURCES.md](DATA_SOURCES.md) | 根拠コーパス全件の出自 |
| [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) | 色・書体・構造 |
| [SECURITY.md](SECURITY.md) | 脅威モデルと対策、既知の限界 |
| [TEST_REPORT.md](TEST_REPORT.md) | 実際に実行した検証とその結果 |
| [EVALUATION_REPORT.md](EVALUATION_REPORT.md) | 10視点からの自己批判 |
| [COMPETITOR_ANALYSIS.md](COMPETITOR_ANALYSIS.md) | 先行研究・競合との差分 |
| [CONTEST_STRATEGY.md](CONTEST_STRATEGY.md) | 応募戦略と想定問答 |
| [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) | デプロイ手順 |
| [FINAL_REPORT.md](FINAL_REPORT.md) | 完成状況と残課題 |

## 読むときの注意

- このシステムは未来を予測しません。2050年の語りはすべて条件付きの仮想です。
- 数値には出典と限界が併記されています。限界を外して数値だけを引用しないでください。
- システムは結論を出しません。最終的な判断はユーザーが行います。
- 履歴は既定でブラウザ内にのみ保存されます。サーバーには送信されません。

## ライセンスと素材

コードは本リポジトリの作成者に帰属します。画像素材は使用していません
（図版はすべてCSSとSVGで描画）。書体は Google Fonts の
Shippori Mincho / Zen Kaku Gothic New / IBM Plex Mono（SIL Open Font License）を
`next/font` で自己ホストしています。引用した資料は [DATA_SOURCES.md](DATA_SOURCES.md)
に出典・発行機関・URL・確認日を記載しています。
