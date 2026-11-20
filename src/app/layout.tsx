import type { Metadata, Viewport } from "next";
import {
  IBM_Plex_Mono,
  Shippori_Mincho,
  Zen_Kaku_Gothic_New,
} from "next/font/google";
import "./globals.css";

/**
 * Typography.
 *
 * Shippori Mincho carries the display voice: a Japanese mincho whose Latin
 * companion is drawn to sit with it, so the bilingual interface does not switch
 * personality between scripts. Zen Kaku Gothic New runs the body at a lower
 * contrast than the mincho, which keeps the record readable at length. IBM Plex
 * Mono is reserved for the register — years, citation keys, epistemic stamps —
 * where the text is data rather than prose.
 */

const mincho = Shippori_Mincho({
  weight: ["500", "600"],
  subsets: ["latin"],
  variable: "--font-mincho",
  display: "swap",
  preload: false,
});

const gothic = Zen_Kaku_Gothic_New({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-gothic",
  display: "swap",
  preload: false,
});

const plexMono = IBM_Plex_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "FUTURE WITNESS — 未来の証人",
  description:
    "未来には、まだ声がない。現在の選択が開く複数の未来を、確認できる根拠と反証とともに並べる対話型システム。",
  applicationName: "FUTURE WITNESS",
  openGraph: {
    title: "FUTURE WITNESS — 未来の証人",
    description:
      "The future has no vote yet. A deliberation interface that sets out the futures a present choice opens, with the evidence and the objections beside them.",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f2eb" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1d18" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ja"
      className={`${mincho.variable} ${gothic.variable} ${plexMono.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="min-h-full antialiased">
        <a
          href="#main"
          className="t-mono no-print sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:border focus:border-ink focus:bg-paper focus:px-3 focus:py-2"
        >
          本文へ / Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
