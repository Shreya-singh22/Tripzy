# Architecture — Tripzy Full-Stack

## Request Flow

```
Browser (port 8080)
  │
  │  fetch() with Bearer token + credentials:'include'
  ▼
Express API (port 3001)
  │
  ├─ CORS middleware  (allows http://localhost:8080, credentials:true)
  ├─ Morgan logger
  ├─ cookie-parser   (reads httpOnly refreshToken cookie)
  │
  ├─ /api/auth/*
  │    ├─ rate limiter (10 req/min per IP)
  │    ├─ register → authService.register()  → bcrypt hash + JWT issue
  │    ├─ login    → authService.login()     → bcrypt compare + JWT issue
  │    ├─ refresh  → verifyRefreshToken()    → new accessToken
  │    └─ me       → authenticate middleware → authService.getMe()
  │
  ├─ /api/destinations/*
  │    ├─ GET /  GET /:slug  — public
  │    └─ POST PUT DELETE    — authenticate + requireAdmin middleware
  │
  ├─ /api/trip-options/
  │    └─ GET /  — public
  │
  └─ /api/bookings/*
       ├─ authenticate middleware (all routes)
       ├─ POST /   → bookingService.createBooking()
       │              prices fetched from DB — client total ignored
       ├─ GET /    → bookingService.getUserBookings()
       └─ GET /:ref → bookingService.getBookingByRef() — owner or admin
  │
  ├─ centralized errorHandler  (AppError | ZodError | unknown)
  └─ Prisma ORM → SQLite dev.db  (swap to PostgreSQL via DATABASE_URL)
```

## Layer Responsibilities

| Layer | Files | Does |
|---|---|---|
| Routes | `src/routes/*.ts` | Mount middleware, delegate to controller |
| Controllers | `src/controllers/*.ts` | Parse request, call service, return response |
| Services | `src/services/*.ts` | Business logic, DB queries, price computation |
| DB | `src/db/prisma.ts` | Prisma singleton (prevents duplicate instances in hot-reload) |
| Middleware | `src/middleware/` | Auth guard, rate limit, error handler |
| Validation | `src/validation/` | Zod schemas — one schema per endpoint group |
| Utils | `src/utils/` | `tokens.ts` (JWT), `password.ts` (bcrypt), `errors.ts` (AppError) |

## Database Schema

```
User
  id, name, email (unique), phone, pinCode, passwordHash, role, createdAt, updatedAt
  └─ has many Booking

Destination                         TripOption
  id, slug (unique), name, country    id, optionKey (unique), category, title, subtitle, emoji, price
  bestTimeToVisit*  ─ JSON string     category: TRAVEL | FOOD | ACTIVITY
  topAttractions*   ─ JSON string
  travelTips*       ─ JSON string
  tags*             ─ JSON string
  images*           ─ JSON string
  basePrice (₹)
  └─ has many BookingItem             └─ has many BookingItem

Booking
  id, reference (unique, "TRP-XXXXXXXX"), userId, status, total (server-computed), createdAt
  └─ has many BookingItem

BookingItem
  id, bookingId, destinationId?, tripOptionId?, priceAtBooking (snapshot)
```

*JSON arrays stored as strings for SQLite compatibility. **All parsing and stringifying happens exclusively in `destinations.service.ts`** — no other file touches raw JSON strings. The API always returns real arrays.

## Auth Flow

```
Register/Login
  ──────────────────────────────────────────────────────
  Response body:  { user: SafeUser, accessToken: string }
                  ↑ stored in JS memory (lost on refresh)

  Set-Cookie:     refreshToken=<JWT>; HttpOnly; SameSite=Lax; Path=/api/auth
                  ↑ browser sends automatically on /api/auth/* requests

On page load (DOMContentLoaded)
  1. POST /api/auth/refresh  (cookie sent automatically)
  2. If OK → store new accessToken in memory
  3. GET  /api/auth/me       → restore currentUser
  4. Navigate to last page or blog

Request with Bearer token
  Authorization: Bearer <accessToken>
  If 401 → auto-retry after refresh → if refresh fails, redirect to login

Logout
  POST /api/auth/logout → clears refreshToken cookie
  Frontend clears accessToken and currentUser from memory
```

## Price Integrity

The client **never** sends prices to the server. The booking endpoint receives only:
```json
{ "destinationIds": ["cuid…"], "tripOptionIds": ["cuid…"] }
```

The service fetches live DB prices, sums them server-side, and stores the result in `Booking.total`. Each `BookingItem.priceAtBooking` is a price snapshot taken at booking time — old bookings are immune to future price changes.

## Frontend Architecture

```
index.html (SPA — 4 pages shown/hidden via CSS)
script-merged.js
  ├─ apiFetch()           wraps fetch() with Bearer header + 401→refresh retry
  ├─ navigateTo()         shows correct page + auth gate for itinerary
  ├─ initAuthPage()       register + login tabs, password toggle, API calls
  ├─ initBlogPage()       GET /destinations → render cards + carousels
  ├─ initItineraryPage()  GET /destinations + /trip-options → checkboxes
  │                       POST /bookings on confirm
  └─ initConfirmationPage() GET /bookings/:ref → render booking
```

Page init flags (`blogCarouselsReady`, `itineraryReady`) prevent double-binding event listeners. API data is cached in module-level variables (`cachedDestinations`, `cachedTripOptions`) so navigation doesn't re-fetch.

## Security Decisions

| Decision | Rationale |
|---|---|
| httpOnly refresh cookie | JS cannot read it; XSS cannot steal refresh token |
| Short-lived access token (15m) in memory | Clears on page reload; not in localStorage/sessionStorage |
| bcrypt (10 rounds) for password | Industry standard; safe against brute-force |
| PIN code stored plain | It's a postal address field, not a credential |
| Server-side total computation | Client can't fake a lower price |
| `priceAtBooking` snapshot | Repricing never corrupts past bookings |
| Rate limiting on auth endpoints | Slows credential stuffing |
| CORS: single allowed origin | Prevents other sites from using the API |
| Zod validation on every endpoint | Never trust client input |
