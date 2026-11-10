# Security Runbook

## CSP & headers
Next.js (`next.config.mjs`) applies strict CSP, frame-ancestors none, HSTS, permissions policy. Server also adds helmet.

## OWASP ASVS (high-level)
- Authentication: rate limit + lockout; JWT 15min + rotated refresh; password policy; no public sign-up; secrets from env.
- Session: httpOnly cookies, SameSite Lax; CSRF double-submit.
- Access control: global guards + ownership checks.
- Input: class-validator + Zod; whitelist+forbidNonWhitelisted.
- Cryptography: bcrypt, AES-256-GCM field encryption (planned).
- Error handling: generics for auth, requestId, no stack leakage in prod.
- Logging: redaction of passwords/tokens/OTPs/contactInfo.
- File upload: size + magic bytes; private bucket; presigned URLs.
- API: pagination & validation maxima.
- SSRF/headers/CSP addressed.

## Dependency audit
Run `pnpm audit` in CI; review high/critical manually. Allow only approved builds.

## Backups
Postgres: `pg_dump -Fc ccms > backups/ccms-$(date +%F).dump`
MinIO: `mc mirror --watch` or versioned bucket replication.
Restore procedures documented below.

## Rate-limit review
- `@nestjs/throttler` per-IP + per-account (lockout).
- Public tracker 10/min/IP + cache.
- Upload max 20 MB.

## Secrets management
- All secrets via env; `.env` gitignored; fail-fast Zod validation (server).
- CI vars from GitHub Secrets; never in repo.
