"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Stage } from "@/components/Stage";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

/**
 * The first screen.
 *
 * It holds two sentences and one thing to do. Everything this project can
 * explain about itself is a quiet link away, because a reader who has not yet
 * heard the voice has no reason to care how the citations are checked.
 *
 * The second line arrives after the first, in silence. That gap is the piece:
 * "the future has no voice yet" has to be allowed to sit there before it is
 * answered. With reduced motion both lines are simply present — the meaning
 * survives without the timing, and a reader who asked for less motion should
 * not be made to wait for text.
 */

const BEAT_MS = 2_600;

export function Opening() {
  const reduced = usePrefersReducedMotion();
  const [beatPassed, setBeatPassed] = useState(false);
  // Derived rather than set in the effect: a reader who asked for less motion
  // should find the words already there, not watch them being switched on.
  const answered = reduced || beatPassed;

  useEffect(() => {
    if (reduced) return;
    const timer = setTimeout(() => setBeatPassed(true), BEAT_MS);
    return () => clearTimeout(timer);
  }, [reduced]);

  return (
    <main className="opening">
      <div className="opening__field" aria-hidden="true">
        <Stage agent="MIRAI" level={0} active={false} label="" />
      </div>

      <div className="opening__words">
        <h1 className="opening__line">
          未来には、まだ声がない。
          <span className="opening__en">The future has no voice yet.</span>
        </h1>

        <p className={`opening__answer${answered ? " is-here" : ""}`}>
          未来の誰かと、話をしよう。
          <span className="opening__en">Talk with someone who lives there.</span>
        </p>

        <div className={`opening__act${answered ? " is-here" : ""}`}>
          <Link href="/deliberate" className="opening__begin">
            対話をはじめる
          </Link>
        </div>
      </div>

      <nav className={`opening__aside${answered ? " is-here" : ""}`}>
        <Link href="/about">この仕組みについて</Link>
        <span aria-hidden="true">/</span>
        <Link href="/about#sources">出典</Link>
      </nav>

      <p className="opening__caveat">
        このシステムは未来を予測しません。2050年の語りはすべて条件付きの仮想です。
      </p>
    </main>
  );
}
