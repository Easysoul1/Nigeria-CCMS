# Court Case Management & Public Tracking System

Production-grade, secure case management for the Federal High Court of Nigeria.

## Architecture

```mermaid
flowchart LR
  Browser[Next.js Client (public + app)] --><|channel|>cookies/https| GW[Reverse Proxy TLS]
  GW --> API[NestJS API]
  API --> DB[(PostgreSQL)]
  API --> Redis[(Redis + BullMQ)]
  API --> MinIO[(MinIO S3)]
  API --> Q[Workers: OCR + Notifications]
  Q --> Termii[Termii SMS]
  Q --> SendGrid[SendGrid Email]
  API --> ClamAV[ClamAV]
```

## Stack
pnpm workspaces + Turborepo. `apps/server` (NestJS), `apps/client` (Next.js), `packages/shared` (Zod, enums).

## Getting started
```
docker compose up -d
pnpm install && pnpm dev
```
`/health` → OK.

## API versioning
URI prefix `/api/v1` planned; currently direct routes. Migration path: introduce version module and redirect.
# Nigeria-CCMS
