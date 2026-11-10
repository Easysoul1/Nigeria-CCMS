# Deployment

This guide covers three deployment paths for the Court CCMS.

## Path A - VPS with Caddy

Best for a real domain. Cost roughly 5 EUR per month.

Database is Turso, so there is no local SQLite file to back up and no persistent volume required. Turso runs the database itself.

Prerequisite:

1. Create a Turso database: turso db create ccms
2. Note the URL: turso db show ccms --url
3. Create a token: turso db tokens create ccms

Setup on the VPS:

1. Clone the repo to /opt/court-ccms.
2. Copy .env.production.example to .env.production.
3. Fill in DOMAIN, JWT_SECRET (openssl rand -hex 64), TURSO_DATABASE_URL, TURSO_AUTH_TOKEN, and the MinIO values.
4. Push the schema once: ./scripts/turso-push.sh ccms
5. Seed the database once: TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... NODE_ENV=development ALLOW_SEED=1 pnpm --filter @court-ccms/server exec prisma db seed
6. Start the stack: docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
7. Watch the logs: docker compose logs -f api

Caddy fetches a Let's Encrypt certificate on the first request to your domain. Open ports 80 and 443, and point the domain A record at the VPS IP.

On every redeploy: git pull, rerun the compose command, and run ./scripts/turso-push.sh again if the schema changed.

Backups happen inside Turso. Use the Turso dashboard to take snapshots, or turso db shell ccms .dump to export.

## Path B - Vercel plus Render

Best if you have a domain but no server. Cost 7 USD per month.

Backend on Render (free tier):

1. Create the Turso database first (see Path A, prerequisites).
2. Push the schema: ./scripts/turso-push.sh ccms
3. Seed it locally against Turso: TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... NODE_ENV=development ALLOW_SEED=1 pnpm --filter @court-ccms/server exec prisma db seed
4. Dashboard, New, Blueprint, point at this repo. It reads render.yaml.
5. Free plan is enough. There is no persistent disk any more because the database lives in Turso.
6. Render generates JWT_SECRET automatically and assigns the URL. Note it down, you need it for Vercel.
7. Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in the Render dashboard.
8. Set CORS_ORIGINS to the Vercel URL exactly.

Frontend on Vercel:

1. Import the repo. Set Root Directory to apps/client.
2. Turn on Include source files outside of the Root Directory so pnpm workspace resolves.
3. Environment variables:
   - NEXT_PUBLIC_API_URL = https://your-vercel-app.vercel.app
   - API_UPSTREAM = https://your-render-service.onrender.com
4. Deploy. After the first deploy note the URL and set NEXT_PUBLIC_API_URL to it, then redeploy because that value is baked into the JS bundle at build time.

Why the proxy matters:

Without API_UPSTREAM, the browser calls onrender.com directly. That is a different site from vercel.app, so the browser will not send SameSite=Lax cookies. Login succeeds, the next request returns 401, and you get a redirect loop.

With API_UPSTREAM set, the browser only talks to vercel.app. Next.js proxies /api/v1 server-side. Cookies stay first-party. Safari stops breaking.

## Path C - Cloudflare Tunnel

For demo only. Cost is zero.

1. Build the server: pnpm --filter @court-ccms/server build.
2. Start the API with NODE_ENV=production node apps/server/dist/main.js in one terminal.
3. Build the client with NEXT_PUBLIC_API_URL set to the tunnel URL (you get this after step 4).
4. Run cloudflared tunnel --url http://localhost:3000 in another terminal. Note the URL it prints.
5. Rebuild the client with that URL and start it: pnpm --filter @court-ccms/client exec next start.

Good enough for a demo. Not for anything that has to survive a reboot.

---

## Database: Turso (libSQL)

The production database is Turso, a managed SQLite-compatible service. Free tier covers 500 databases, 9 GB storage and 1 billion row reads per month, which is far more than this app will ever use.

Local development still uses a plain file:./dev.db via the default Prisma SQLite driver. The switch is automatic: if TURSO_DATABASE_URL is set and starts with libsql://, PrismaService and the seed script use the libSQL adapter; otherwise they fall back to the file driver. You never have to change code to move between them.

Why Turso rather than a local SQLite file on the host:

- Data lives in Turso, so nothing is lost when Render restarts the service. That removes the need for a paid disk.
- Backups are Turso's responsibility, not yours.
- The app is still SQLite: the same schema, the same Prisma queries, no Postgres migration.

Schema changes:

- Local: pnpm --filter @court-ccms/server exec prisma db push
- Production: ./scripts/turso-push.sh ccms after editing schema.prisma

Seeding:

The entrypoint seeds only if the user table is empty and ALLOW_SEED=1 is set. You can also seed by hand at any time:

TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... NODE_ENV=development ALLOW_SEED=1 pnpm --filter @court-ccms/server exec prisma db seed

ALLOW_SEED=1 bypasses the production guard in prisma/seed.ts. Leave it at 0 in .env.production and let the entrypoint set it only on first boot.

---

## Troubleshooting

NEXT_PUBLIC_API_URL is baked at build time. Changing it in Vercel's env panel does nothing until you redeploy the frontend.

prisma db push does not work against libsql://. Use ./scripts/turso-push.sh for production schema changes; prisma db push is fine locally.

Turso writes serialize like any SQLite database. The API must run a single instance. That is already the case on Render free and in the compose file.

ALLOW_SEED should be 0 in production. The entrypoint flips it to 1 only when the database is empty.

If TURSO_DATABASE_URL is unset, the app falls back to a local file. That is correct in development and wrong in production: a production deploy with no Turso env vars is writing to a file that does not survive a restart.

Document upload and download require MinIO. The /health endpoint reports degraded when it is missing, which is correct; the platform probe returns 200 as long as the database is reachable.

Health check timeout. Render's probe has a short timeout. Turso latency is normally under 50 ms but a cold start on the free tier can take 20 to 30 seconds. If you see restarts, increase the health check grace period in the Render dashboard.
