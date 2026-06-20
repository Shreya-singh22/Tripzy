# Tripzy — Full-Stack Travel Portal

A travel-booking SPA with a Node.js/Express backend, Prisma ORM (SQLite → PostgreSQL), JWT auth, and server-computed booking totals.

## Team Members

- **Shreya Singh Chauhan**
- **Ashish Rai**
- **Keshav Agarwal**
- **Ravi Kumar**

## Course Information

**Course:** CSET382 - Web Technologies | **Institution:** Bennett University | **Academic Year:** 2024-25

---

## Quick Start

```bash
# 1. Install backend dependencies
cd server && npm install

# 2. Copy and configure environment
cp .env.example .env
# Edit .env — set JWT_ACCESS_SECRET and JWT_REFRESH_SECRET to random 48-char strings
# Generate: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

# 3. Run database migrations
npm run migrate

# 4. Seed destinations, trip options, and admin user
npm run seed

# 5. Start the API server  →  http://localhost:3001
npm run dev

# 6. In a separate terminal, serve the frontend  →  http://localhost:8080
cd ..
python3 -m http.server 8080
```

Open **http://localhost:8080** in your browser.

---

## Environment Variables (`server/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | ✅ | — | `file:./dev.db` (SQLite) or `postgresql://…` |
| `JWT_ACCESS_SECRET` | ✅ | — | Random ≥32-char string |
| `JWT_REFRESH_SECRET` | ✅ | — | Random ≥32-char string (different from access) |
| `JWT_ACCESS_EXPIRES_IN` | — | `15m` | Access token lifetime |
| `JWT_REFRESH_EXPIRES_IN` | — | `7d` | Refresh token lifetime |
| `PORT` | — | `3001` | API server port |
| `FRONTEND_URL` | — | `http://localhost:8080` | CORS allowed origin |
| `ADMIN_EMAIL` | — | `admin@tripzy.com` | Seeded admin email |
| `ADMIN_PASSWORD` | — | `Admin@123456` | Seeded admin password — **change this** |

---

## npm Scripts (run from `server/`)

| Script | Description |
|---|---|
| `npm run dev` | Start with hot-reload (ts-node-dev) |
| `npm run build` | Compile TypeScript → `dist/` |
| `npm start` | Run compiled server |
| `npm run migrate` | Prisma migrate dev |
| `npm run migrate:deploy` | Prisma migrate deploy (production) |
| `npm run seed` | Seed destinations, options, admin user |
| `npm test` | Integration tests (Vitest + Supertest) |

---

## API Reference

### Health
```
GET /api/health → { status: "ok", timestamp: "…" }
```

### Auth — `/api/auth`

| Method | Path | Body | Auth | Response |
|---|---|---|---|---|
| POST | `/register` | `{ name, email, phone, pinCode, password }` | — | `{ user, accessToken }` + httpOnly refresh cookie |
| POST | `/login` | `{ email, password }` | — | `{ user, accessToken }` + httpOnly refresh cookie |
| POST | `/logout` | — | cookie | 204 |
| POST | `/refresh` | — | refresh cookie | `{ accessToken }` |
| GET | `/me` | — | Bearer | `{ user }` |

Validation rules: `phone` = 10 digits, `pinCode` = 6-digit Indian postal code (stored plain — address data, not a credential), `password` ≥8 chars + 1 uppercase + 1 digit.

### Destinations — `/api/destinations`

| Method | Path | Auth |
|---|---|---|
| GET | `/` | public |
| GET | `/:slug` | public |
| POST / PUT / DELETE | `/ / /:id` | Admin Bearer |

### Trip Options — `GET /api/trip-options`
Public. Returns all 14 seeded options (TRAVEL, FOOD, ACTIVITY).

### Bookings — `/api/bookings`

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/` | Bearer | `{ destinationIds[], tripOptionIds[] }` — **total computed server-side** |
| GET | `/` | Bearer | Current user's bookings |
| GET | `/:ref` | Bearer | Owner or admin only |

### Error shape
```json
{ "error": { "code": "VALIDATION_ERROR", "message": "phone: Must be exactly 10 digits" } }
```

---

## Switching from SQLite to PostgreSQL

1. In `server/prisma/schema.prisma`, change `provider = "sqlite"` → `"postgresql"`
2. Set `DATABASE_URL` in `.env` to your Postgres connection string
3. `npm run migrate`

No application code changes needed.

---

## Running Tests

Tests use the dev database and clean up by email prefix (`vitest-*`). Migrate and seed first.

```bash
cd server && npm test
```

---

## Deployment

**API** (Render / Railway / Fly.io): build = `npm ci && npx prisma generate && npm run migrate:deploy && npm run seed && npm run build`, start = `npm start`, add managed Postgres add-on.

**Frontend** (Netlify / Vercel / Cloudflare Pages): static site. Update `API_BASE` in `script-merged.js` to your deployed API URL, then deploy the repo root.

---

## Project Structure

```
Tripzy/
├── index.html           # SPA (4 pages: auth, blog, itinerary, confirmation)
├── script-merged.js     # All frontend JS — API calls replace localStorage
├── styles.css           # Global styling (unchanged)
├── assets/              # Destination images
└── server/
    ├── prisma/
    │   ├── schema.prisma    # DB schema (SQLite/Postgres via env)
    │   └── seed.ts          # Seeds 5 destinations + 14 options + admin user
    └── src/
        ├── app.ts           # Express app (exported for testing)
        ├── index.ts         # Server entrypoint
        ├── routes/          # auth, destinations, trip-options, bookings
        ├── controllers/     # Request/response layer
        ├── services/        # Business logic (JSON parse/stringify lives here)
        ├── middleware/      # auth, errorHandler, rateLimiter
        ├── validation/      # Zod schemas
        ├── utils/           # tokens, password, errors
        ├── db/              # Prisma client singleton
        └── tests/           # auth.test.ts, bookings.test.ts
```

---


