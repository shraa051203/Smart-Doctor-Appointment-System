# Smart Doctor Appointment System

Full-stack app: **React + Tailwind** (frontend), **Express + Mongoose** (backend), **JWT + bcrypt** auth, **MongoDB** storage.

## Prerequisites

- Node.js 18+
- MongoDB running locally or a connection string (MongoDB Atlas)

## Quick start

### 1. MongoDB

Start local MongoDB, or create a cluster and copy the connection URI.

### 2. Backend

```bash
cd backend
cp .env.example .env
# Edit .env: set MONGODB_URI and JWT_SECRET
npm install
npm run dev
```

API runs at `http://localhost:5000` (configurable via `PORT`).

**Create an admin user** (needed for `POST /api/doctors` and analytics UI):

```bash
npm run seed:admin
```

Uses `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `ADMIN_NAME` from `.env` (see `.env.example`).

**Seed sample doctors** (specializations + 7 days of bookable slots):

```bash
npm run seed:doctors
```

Creates five demo doctors if their emails are not already registered. Log in as any of them with the same password (default `Doctor123!`, or set `SEED_DOCTOR_PASSWORD` in `.env`). Patient users can browse **Doctors** and book immediately.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. The Vite dev server proxies `/api` to `http://localhost:5000`.

Optional: set `VITE_API_URL` in `.env` (see `frontend/.env.example`) if you deploy the API elsewhere.

## User flows

| Role    | How to get an account |
|--------|------------------------|
| Patient | Register on `/register` as Patient |
| Doctor  | Register as Doctor, **or** Admin creates one via **Add doctor** (after seeding admin) |
| Admin   | `npm run seed:admin` — then log in with admin credentials |

Doctors must **set availability** (date + time buttons) on the doctor dashboard before patients can book those slots.

## API summary

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | — | Patient or doctor signup |
| POST | `/api/auth/login` | — | Login |
| GET | `/api/auth/me` | JWT | Current user |
| GET | `/api/doctors` | — | List doctors; `?specialization=` filter |
| GET | `/api/doctors/:id` | — | Doctor profile (Mongo id of **DoctorProfile**) |
| GET | `/api/doctors/profile/me` | Doctor | Own profile |
| PUT | `/api/doctors/availability/me` | Doctor | Replace availability `{ slots: [{ date, slots }] }` |
| POST | `/api/doctors` | Admin | Create doctor user + profile |
| POST | `/api/appointments/book` | Patient | Book slot |
| GET | `/api/appointments/user` | Patient | My appointments |
| GET | `/api/appointments/doctor` | Doctor | My bookings |
| PATCH | `/api/appointments/:id/status` | Doctor | `completed` / `cancelled` / `pending` |
| GET | `/api/appointments/analytics` | Admin | Counts + top doctors |

Double booking is blocked by a unique compound index on `doctor + date + time`.

## Email notifications (optional)

In `backend/.env`, set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `EMAIL_FROM`. If `SMTP_HOST` is empty, booking emails are skipped (logged only).

## Production notes

- Set `NODE_ENV=production` on the API. The server enforces: **MongoDB URI required**; **JWT_SECRET at least 32 characters** and not a default/weak phrase; generic **500** responses without leaking stack traces; **Helmet** security headers; **graceful shutdown** on `SIGINT`/`SIGTERM`.
- Use HTTPS everywhere. Set **`FRONTEND_URL`** to your real frontend origin for CORS.
- Frontend: `cd frontend && npm run build` — serve `dist/` with any static host or CDN. Optionally set **`VITE_API_URL`** to your public API base (e.g. `https://api.example.com/api`).
- The SPA axios client uses a **30s timeout** and clears the session on **401** (except login/register) so expired tokens do not leave the UI in a broken state.

## Project layout

```
backend/src/     server, models, routes, middleware
frontend/src/    pages, components, API client, auth context
```
