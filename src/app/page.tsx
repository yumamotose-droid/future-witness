import Link from "next/link";
import { ThemeScript } from "@/components/ThemeScript";
import { Timeline } from "@/components/Timeline";
import { CORPUS, ALL_FINDING_IDS } from "@/lib/evidence/corpus";

export default function Home() {
  const stages = [
    {
      n: "01",
      ja: "問いを立て直し、隠れた前提を取り出す",
      en: "Restate the question and surface its premises",
      body: "「経済発展のために」のような語が前提として何を settled 扱いにしているかを分解し、誰が今日投票できて誰ができないかを並べる。",
    },
    {
      n: "02",
      ja: "選択肢を三つ以上つくる",
      en: "Build three or more options",
      body: "賛否の二択にしない。少なくとも一つは、段階化・条件付け・可逆化によって問題の形そのものを変える案にする。",
    },
    {
      n: "03",
      ja: "根拠を照合し、限界を併記する",
      en: "Check the evidence and attach its limits",
      body: "出典IDをコーパスと機械的に突き合わせる。存在しない出典は削除し、根拠を失った記述は推論に格下げする。数値には必ずその数値の限界を付ける。",
    },
    {
      n: "04",
      ja: "未来を分岐させ、2050年から一人に語らせる",
      en: "Branch the future, then let one person in 2050 speak",
      body: "選択肢ごとに2030・2040・2050の層を作る。そこで暮らす一人が日常を語る。これは予測ではなく、条件付きの仮想である。",
    },
    {
      n: "05",
      ja: "すべてに反証する。自分自身にも",
      en: "Object to all of it, including ourselves",
      body: "経済合理性、実現可能性、倫理、最良の反対論、副作用を突く。そして、この語りが根拠を超えた感情的効果を持っていないかを必ず批判する。",
    },
    {
      n: "06",
      ja: "あなたが決め、変化が記録される",
      en: "You decide, and the movement is recorded",
      body: "審議の前と後で、あなたの選択と確信の度合いを記録する。システムは結論を出さない。残された疑問も含めて、記録はあなたのものになる。",
    },
  ];

  const agents = [
    {
      name: "CHRONOS",
      ja: "クロノス",
      role: "未来を分岐させる",
      body: "選択肢ごとに2030・2040・2050の層を組み、選択肢の間で方向が異なる指標を揃える。根拠のない確率は出さない。",
    },
    {
      name: "EVIDENCE",
      ja: "エビデンス",
      role: "確認できることだけを述べる",
      body: "手渡された資料の記述だけを引用する。引用できる出典IDは固定されており、それ以外は検証層が削除する。",
    },
    {
      name: "MIRAI",
      ja: "ミライ",
      role: "2050年を生きる一人の生活",
      body: "一人称で、ある一日の具体から語る。得たものと失ったものの両方を言う。読者に何をすべきかは言わない。",
    },
    {
      name: "COUNTER",
      ja: "カウンター",
      role: "すべてに反証する",
      body: "他の三者の出力を攻撃する。ユーザーに同調しない。安心させて終わらない。このシステム自身の演出も標的にする。",
    },
  ];

  const mechanisms = [
    {
      ja: "出典が存在するかを機械的に照合する",
      body: "モデルが示した出典IDをコーパスと突き合わせる。存在しないIDは画面に出る前に削除し、根拠を失った記述は「確認された根拠」から「推論」に格下げする。削除件数と格下げ件数は検証記録として毎回表示される。",
    },
    {
      ja: "文の単位で認識論的な型を持たせる",
      body: "すべての文が「確認された根拠／推論／仮想シナリオ／情報不足」のいずれかの型を持ち、スキーマ検証を通らない出力は画面に出ない。事実と仮想の分離は、プロンプトへの期待ではなくデータ構造の性質になっている。",
    },
    {
      ja: "判断の前と後を記録する",
      body: "AIの出力を見る前にあなたの立場を記録し、終わったあとにもう一度記録する。システムは結論を出さず、変化だけを残す。これは一度の会話では作れない計測である。",
    },
    {
      ja: "同じ問いを通常のチャットにも投げて並べる",
      body: "役割分担も出典照合もない一回の応答を、同じ画面で比較できる。この主張は読者が自分で確かめられる。",
    },
  ];

  return (
    <>
      <ThemeScript />

      {/* ---------- hero ---------- */}
      <section className="relative min-h-[88svh] overflow-hidden px-4 pb-20 pt-10 sm:px-8">
        <Timeline />
        <div className="mx-auto max-w-[78rem] pl-10 sm:pl-20">
          <p className="t-eyebrow anim-settle">
            Future Witness — 未来の証人
          </p>

          <h1 className="t-display mt-[16svh] text-[clamp(2.3rem,7.2vw,5.25rem)]">
            <span
              className="anim-settle block"
              style={{ animationDelay: "240ms" }}
            >
              未来には、
            </span>
            <span
              className="anim-settle block"
              style={{ animationDelay: "620ms" }}
            >
              まだ声がない
              <span className="text-[var(--gold)]">。</span>
            </span>
          </h1>

          <p
            className="anim-settle t-display mt-10 max-w-[30rem] text-[clamp(1rem,2.1vw,1.375rem)] text-ink-soft"
            style={{ animationDelay: "1100ms" }}
          >
            あなたの今日の選択について、2050年の人々と話してみませんか？
          </p>

          <nav
            className="anim-settle mt-12 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-8"
            style={{ animationDelay: "1400ms" }}
            aria-label="開始"
          >
            <Link
              href="/deliberate?demo=1"
              className="btn"
              data-variant="primary"
            >
              審査員向けデモ（90秒）
            </Link>
            <Link href="/deliberate" className="link t-mono-plain">
              自分の問いで証言をはじめる →
            </Link>
          </nav>

          <p
            className="anim-settle mt-16 max-w-[32rem] text-[0.875rem] leading-[1.9] text-ink-faint"
            style={{ animationDelay: "1700ms" }}
          >
            このシステムは未来を予測しません。現在の選択が開く複数の未来を、確認できる根拠と、
            それに対する反証とともに並べます。結論は出しません。
          </p>
        </div>
      </section>

      <main id="main">
        {/* ---------- the pipeline ---------- */}
        <section className="rule-t px-4 py-20 sm:px-8">
          <div className="mx-auto max-w-[78rem]">
            <div className="flex flex-wrap items-baseline justify-between gap-4">
              <h2 className="t-display text-[clamp(1.5rem,3.4vw,2.25rem)]">
                このシステムが実際にしていること
              </h2>
              <p className="t-mono text-ink-faint">Six steps, in order</p>
            </div>

            <ol className="mt-12 grid border-t border-rule sm:grid-cols-2 sm:gap-x-10 lg:grid-cols-3 lg:gap-x-14">
              {stages.map((stage) => (
                <li
                  key={stage.n}
                  className="rule-b flex flex-col gap-3 py-8"
                >
                  <span className="t-mono text-[var(--gold)]">{stage.n}</span>
                  <h3 className="t-display text-[1.0625rem] leading-[1.6]">
                    {stage.ja}
                  </h3>
                  <p className="t-mono-plain text-ink-faint">{stage.en}</p>
                  <p className="mt-1 text-[0.875rem] leading-[1.95] text-ink-soft">
                    {stage.body}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ---------- the four roles ---------- */}
        <section className="rule-t bg-paper-deep px-4 py-20 sm:px-8">
          <div className="mx-auto max-w-[78rem]">
            <h2 className="t-display text-[clamp(1.5rem,3.4vw,2.25rem)]">
              四つの役割
            </h2>
            <p className="mt-4 max-w-[34rem] text-[0.875rem] leading-[1.95] text-ink-soft">
              別々のモデルではなく、役割別のプロンプト、構造化出力、
              そして出力後の検証処理の組み合わせです。内部は四つに分かれていますが、
              画面はひとつの記録として読めます。
            </p>
            <dl className="mt-12 grid border-t border-rule md:grid-cols-2 md:gap-x-14">
              {agents.map((agent) => (
                <div
                  key={agent.name}
                  className="rule-b py-8"
                >
                  <dt className="flex flex-wrap items-baseline gap-3">
                    <span className="t-mono text-ink">{agent.name}</span>
                    <span className="t-display text-[1.125rem]">
                      {agent.ja}
                    </span>
                    <span className="t-mono-plain text-ink-faint">
                      {agent.role}
                    </span>
                  </dt>
                  <dd className="mt-3 max-w-[30rem] text-[0.875rem] leading-[1.95] text-ink-soft">
                    {agent.body}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* ---------- why not a single chat ---------- */}
        <section className="rule-t px-4 py-20 sm:px-8">
          <div className="mx-auto max-w-[78rem]">
            <h2 className="t-display text-[clamp(1.5rem,3.4vw,2.25rem)]">
              通常のチャットでは満たせないこと
            </h2>
            <p className="mt-4 max-w-[36rem] text-[0.875rem] leading-[1.95] text-ink-soft">
              人格設定を与えたチャットでも、未来の人物を演じることはできます。
              この四つは、演技ではなく機構によって成立しています。
            </p>
            <ul className="mt-12 max-w-[46rem] border-t border-rule">
              {mechanisms.map((item, index) => (
                <li
                  key={item.ja}
                  className="rule-b flex gap-5 py-7 sm:gap-8"
                >
                  <span className="t-mono mt-1 shrink-0 text-ink-faint">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3 className="t-display text-[1.0625rem] leading-[1.6]">
                      {item.ja}
                    </h3>
                    <p className="mt-2 text-[0.875rem] leading-[1.95] text-ink-soft">
                      {item.body}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ---------- the corpus, stated plainly ---------- */}
        <section className="rule-t bg-paper-deep px-4 py-20 sm:px-8">
          <div className="mx-auto max-w-[78rem]">
            <div className="flex flex-wrap items-baseline justify-between gap-6">
              <h2 className="t-display text-[clamp(1.5rem,3.4vw,2.25rem)]">
                引用できる資料は、これだけです
              </h2>
              <p className="t-mono text-ink-faint">
                {CORPUS.length} documents · {ALL_FINDING_IDS.length} citable
                findings
              </p>
            </div>
            <p className="mt-4 max-w-[36rem] text-[0.875rem] leading-[1.95] text-ink-soft">
              コーパスは手作業で作られ、URLは確認日とともに記録されています。
              この一覧の外にある出典をモデルが示した場合、検証層がそれを削除します。
              コーパスが小さいことは弱点ですが、隠すべき弱点ではありません。
            </p>
            <ul className="mt-10 grid border-t border-rule sm:grid-cols-2 sm:gap-x-10 lg:grid-cols-3 lg:gap-x-14">
              {CORPUS.map((source) => (
                <li
                  key={source.id}
                  className="rule-b py-6"
                >
                  <p className="t-mono-plain text-ink-faint">
                    {source.org} · {source.year}
                  </p>
                  <p className="mt-2 text-[0.9375rem] leading-[1.7]">
                    {source.titleJa}
                  </p>
                  <p className="t-mono mt-3 text-ink-faint">
                    {source.findings.length} findings · checked{" "}
                    {source.checkedOn}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ---------- footer ---------- */}
        <footer className="rule-t px-4 py-16 sm:px-8">
          <div className="mx-auto grid max-w-[78rem] gap-10 lg:grid-cols-[1fr_auto]">
            <div>
              <h2 className="t-mono text-ink">読むときの注意</h2>
              <ul className="mt-5 max-w-[40rem] space-y-3 text-[0.875rem] leading-[1.95] text-ink-soft">
                <li>
                  このシステムは未来を予測しません。2050年の語りはすべて条件付きの仮想です。
                </li>
                <li>
                  数値は出典とその限界を併記しています。限界を外して数値だけを引用しないでください。
                </li>
                <li>
                  システムは結論を出しません。最終的な判断はあなたが行い、記録もあなたのものです。
                </li>
                <li>
                  履歴はこの端末のブラウザ内にのみ保存されます。サーバーには送信されません。
                </li>
              </ul>
            </div>
            <div className="lg:text-right">
              <p className="t-display text-[1.25rem]">The Future Has a Voice.</p>
              <p className="t-mono mt-3 text-ink-faint">
                Future Witness · 未来の証人
              </p>
              <Link
                href="/deliberate?demo=1"
                className="link t-mono-plain mt-6 inline-block"
              >
                デモをはじめる →
              </Link>
            </div>
          </div>
        </footer>
      </main>
    </>
  );
}
