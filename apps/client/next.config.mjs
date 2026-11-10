/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV !== "production";

const apiOrigin = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000").origin;
  } catch {
    return "http://localhost:4000";
  }
})();

// Next.js dev mode compiles modules with `eval`, and HMR needs a websocket.
// Production keeps `unsafe-eval` out of the policy.
const scriptSrc = isDev ? "'self' 'unsafe-inline' 'unsafe-eval'" : "'self' 'unsafe-inline'";
const connectSrc = ["'self'", apiOrigin, ...(isDev ? ["ws:", "wss:"] : [])].join(" ");

const csp = [
  "default-src 'self'",
  `script-src ${scriptSrc}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  `connect-src ${connectSrc}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

// Only advertise HSTS over real TLS; sending it on http://localhost pins the
// dev origin to https in some browsers.
if (!isDev) {
  securityHeaders.push({ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" });
}

const nextConfig = {
  // Required by apps/client/Dockerfile — emits a self-contained server.js.
  output: "standalone",

  // Optional cross-origin proxy. When API_UPSTREAM is set (Vercel + Render),
  // the browser only ever talks to the frontend origin, so auth cookies stay
  // first-party (SameSite=Lax) and Safari doesn't drop them.
  // When it is empty (VPS + Caddy), Caddy does the routing and this is a no-op.
  async rewrites() {
    const upstream = process.env.API_UPSTREAM?.trim();
    if (!upstream) return [];
    return [
      {
        source: "/api/v1/:path*",
        destination: `${upstream.replace(/\/$/, "")}/api/v1/:path*`,
      },
    ];
  },

  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
