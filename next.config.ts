import type { NextConfig } from "next";

/**
 * Cache Components and partial prefetching are switched off deliberately.
 * They are incompatible with the per-route `runtime` / `dynamic` / `maxDuration`
 * configuration the streaming deliberation endpoint needs, and a contest demo
 * is the wrong place to trade predictable request handling for a newer caching
 * model. Revisit when the streaming route no longer needs segment config.
 */
const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            // The app uses the microphone only through the browser's own
            // speech API, which the user starts explicitly.
            value: "camera=(), geolocation=(), microphone=(self)",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // Next injects inline bootstrap scripts; styles come from
              // Tailwind's generated sheet plus inline custom properties.
              // React's development build needs eval() for its error overlay
              // and never uses it in a production build, so the allowance is
              // scoped to development only.
              process.env.NODE_ENV === "development"
                ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
                : "script-src 'self' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data:",
              "font-src 'self' data:",
              // The browser speaks only to this origin. No third-party calls.
              "connect-src 'self'",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "object-src 'none'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
