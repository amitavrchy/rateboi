# RateBoi API (backend)

NestJS 12 (ESM) · Prisma 7 · PostgreSQL 17 · Redis/BullMQ. Spec: [`Project_spec.md`](Project_spec.md).

```bash
docker compose up -d                 # postgres :5560, redis :6390
cp .env.example .env
npm install                          # .npmrc sets legacy-peer-deps (npm 10 arborist bug)
npm run prisma:generate              # client → src/generated/prisma (git-ignored)
npm run prisma:validate
npx prisma migrate dev --name init   # first run
npm run start:dev                    # http://localhost:4010/health , API under /api/v1
npm test                             # vitest (rate engine, phone, status machine)
npm run build
```

Key code
- `src/rates/rate-engine.ts` — pure quote engine (slabs, COD base, VAT, expected return cost)
- `src/couriers/courier-adapter.ts` — adapter contract + forward-only status machine
- `src/common/phone.ts` — BD phone normalisation (Bangla digits, +880)
- `prisma/schema.prisma` — full v1 data model
