# TEST_REPORT

実行日: 2026-11-20
環境: macOS (darwin 25.5.0, arm64) / Node v24.16.0 / npm 11.13.0
対象: Next.js 16.4.6 の**本番ビルド**（開発サーバーではありません）

> この文書には、**実際に実行して結果を確認したものだけ**を書いています。
> 未実施の項目は「未実施」として最後に列挙しています。

## 1. 静的検査

| 検査 | コマンド | 結果 |
| --- | --- | --- |
| 型チェック | `npx tsc --noEmit` | **PASS**（エラー0件） |
| Lint | `npx eslint --max-warnings=0` | **PASS**（警告0件） |
| 本番ビルド | `npm run build` | **PASS** |
| 依存の脆弱性（本番） | `npm audit --omit=dev` | **0件** |
| 依存の脆弱性（全体） | `npm audit` | **0件** |

ビルド出力:

```
Route (app)
┌ ○ /
├ ○ /_not-found
├ ƒ /api/baseline
├ ƒ /api/deliberate
├ ƒ /api/health
└ ƒ /deliberate
```

## 2. 単体テスト（Vitest）

```
Test Files  9 passed (9)
     Tests  60 passed (60)
  Duration  329ms
```

| ファイル | 件数 | 何を固定しているか |
| --- | --- | --- |
| `verify.test.ts` | 11 | 出典照合の全分岐。**捏造した出典IDが削除され、`verified`→`inference` に格下げされること**。`unknown` から出典が剥がされること。シナリオ分岐度の計算 |
| `corpus.test.ts` | 6 | 全15資料が8項目の来歴を持つこと。出典IDが一意で解決可能なこと。URLが https であること。全記述が日英と限界を持つこと |
| `sanitize.test.ts` | 12 | 区切り文字の早期クローズが無効化されること。ゼロ幅・双方向制御文字（U+2066 を含む）が除去されること。**「プロンプトインジェクション対策を義務づけるべきか」という正当な問いを弾かないこと**。マークアップ除去 |
| `orchestrator.test.ts` | 8 | 全工程のイベント列。脚本実行がライブと表示されないこと。全出典が解決すること。4つの型がすべて出現すること。COUNTER が自システムを攻撃すること。命令入りの入力でも構造が保たれること |
| `retrieve.test.ts` | 5 | 森林の問いで森林資料が引けること。無関係な問いでも空にならないこと。全記述が引用可能IDつきで整形されること |
| `ratelimit.test.ts` | 4 | バケットの枯渇と回復。経路別・アドレス別の分離 |
| `budget.test.ts` | 5 | トークン・時間の上限で停止すること |
| `report.test.ts` | 2 | レポートに事前事後の立場、差分、来歴8項目、検証記録、免責が含まれること |
| `bilingual.test.ts` | 6 | **全記述が英語の本文を持つこと**。英語欄に日本語文字が残っていないこと。2050年の証言が英語でも存在すること。選択肢・シナリオ・指標・コーパス・UI辞書が両言語を持つこと |

**この過程で見つかって直した実バグ**:
`stripInvisible` が双方向アイソレート（U+2066–U+2069）を除去していませんでした。
テストが検出し、範囲を拡張しました（`src/lib/security/sanitize.ts`）。

## 3. E2Eテスト（Playwright、本番ビルドに対して）

```
20 passed (35.7s)
```

（クリーンビルド後の最終実行。）

- **desktop**: Chromium 1280×720
- **mobile**: WebKit / iPhone 13 プリセット（375×812）

| テスト | 検証内容 |
| --- | --- |
| landing / states the thesis | ヒーローの文言、両方の導線、コーパス件数の開示、**コンソールエラー0件** |
| landing / never scrolls horizontally | 横スクロール 0px |
| runs end to end | 「事前生成」バッジと理由の注記 → 前提 → 「投票できない」当事者 → コア標本 → 2050年の証言 → COUNTER の自己批判 → 検証記録 → 出典の来歴とURL。**コンソールエラー0件** |
| records the movement | 事前Aで記録 → 事後Cで記録 → 「A → C」と差分が表示される |
| produces a downloadable record | レポート本文に検証記録・URL確認日・免責が含まれる |
| compares itself against a single chat | 比較を実行し、脚本である旨の開示が出る |
| rejects input too short | 8文字未満で送信不可。ページは壊れない |
| treats an embedded instruction as data | 命令入り入力でも構造が保たれ、「投票できない」当事者が残る |
| has no horizontal overflow | 全工程完了後に横スクロール 0px |
| switches the substance, not only the chrome | 言語切替で**画面の枠組みだけでなく、前提・根拠・2050年の証言の本文まで**英語になる。日本語に戻せる |

**この過程で見つかって直した実バグ（2件）**:

1. **英語に切り替えても記述の本文が日本語のままでした。** `Claim` が単一の
   `text` しか持っておらず、画面の枠組みだけが英語になる状態でした。
   実機で切り替えて発見。`Claim.textEn` を追加し、脚本24記述と派生16記述、
   2050年の証言3本すべてに英語を用意し、単体6件とE2E1件で固定しました。
2. モバイル（390px）で指標比較テーブルがページを 43px 横に引っぱっていました。
`overflow-x-auto` の内側にありながら、文書のスクロール幅に寄与していたためです。
横スクロール表をやめ、スマートフォンでは積み上げ表示に切り替えました
（`src/components/CoreSamples.tsx`）。修正後、`scrollWidth === clientWidth`（390px）。

## 4. 実行時の実測（本番、脚本モード）

デモ課題「経済発展のために森林を切り開き、大型商業施設を建設するべきか？」:

```json
{
 "claimsTotal": 36,
 "byKind": { "verified": 8, "inference": 10, "hypothetical": 12, "unknown": 6 },
 "citationsChecked": 28,
 "citationsRejected": 0,
 "scenarioDivergence": 1,
 "sourcesUsed": 7,
 "mode": "scripted",
 "model": "scripted:forest-v1 (hand-written, no model call)",
 "elapsedMs": 1957
}
```

読み方: 36の記述のうち確認された根拠は8、仮想シナリオは12。
**出典28件すべてがコーパスに解決し、削除はゼロ**。シナリオは全指標で方向が分かれています。
そしてこの実行はモデルを一度も呼んでいません（そう表示されます）。

## 5. APIの堅牢性（手動プローブ、本番サーバー）

| 入力 | 応答 |
| --- | --- |
| 壊れたJSON | `400` |
| `{}` | `400 invalid_input` / `question: expected string, received undefined` |
| `"短い"` | `400 invalid_input` / `質問が短すぎます` |
| 同一文字の羅列 | `400 degenerate` / 「問いとして読み取れませんでした」 |
| 4,000文字 | `400` / `Too big: expected string to have <=600 characters` |
| `question: 12345` | `400` / `expected string, received number` |
| 双方向制御文字＋命令文 | **通常どおり審議を実行**。命令に従わず、前提と「投票できない当事者」を出力 |

いずれもサーバーは停止せず、スタックトレースも内部パスも返しません。

## 6. セキュリティの実測

```
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
X-Frame-Options: DENY
Permissions-Policy: camera=(), geolocation=(), microphone=(self)
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline';
  style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:;
  connect-src 'self'; frame-ancestors 'none'; base-uri 'self';
  form-action 'self'; object-src 'none'
```

- `X-Powered-By` は出力されません。
- レスポンス中に鍵らしき文字列はありません（`AIza` / `sk-` / `gho_` で検索、0件）。
- `/api/health` は鍵の**有無**のみ返します。
- 書体は自己ホストのため、外部ドメインへの接続は `connect-src 'self'` のとおり発生しません。

## 7. 証跡（スクリーンショット）

`artifacts/screenshots/` に19枚。デスクトップ1440×900の Light / Dark 各8枚
（ヒーロー、問いの立て直し、根拠、コア標本、証言、反証、検証記録、出典）と、
モバイル WebKit 3枚。`npm run shots` で再取得できます。

Playwright のHTMLレポートとトレースは `artifacts/playwright-report/` にあります。

## 8. 未実施（正直な記録）

以下は**実行していません**。実行したかのように書いていません。

1. **ライブモデルでの実行**。`GEMINI_API_KEY` を保有していないため、
   Gemini API への実呼び出しは一度も行っていません。
   `engine-live.ts` の実動作、レイテンシ、スキーマ適合率、
   実際の捏造引用の発生率は**未検証**です。
   脚本側との共通部分（検証層・予算・ストリーミング・UI）は全て検証済みです。
2. **スクリーンリーダーでの実機検証**（VoiceOver / NVDA）。
   セマンティクスと `sr-only` は実装していますが、読み上げ確認はしていません。
3. **コントラスト比の機械計測**（WCAG AA/AAA の数値確認）。
4. **負荷試験**。同時接続数、レート制限の分散回避耐性は未測定です。
5. **実ユーザーによる評価**。意思決定の質が改善するかの検証は未実施であり、
   これはアプリ自身も「未検証」と表示しています。
6. **Firefox / Safari デスクトップ**での確認。E2E は Chromium と WebKit のみ。
7. **Lighthouse / Core Web Vitals** の計測。
8. **本番デプロイ環境での確認**。Vercel 等への配備は未実施です。

## 再現手順

```bash
npm install
npm run verify        # typecheck + lint + unit + build
npm run test:e2e      # 本番ビルドを立てて Playwright を実行
npm run shots         # スクリーンショットを再取得（先に npm run start -- --port 3100）
```
