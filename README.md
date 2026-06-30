# ArtHub — Server

**ArtHub** is an online art marketplace where collectors can discover and purchase original artworks, artists can showcase and sell their pieces, and admins can manage the platform. This is the Express.js + MongoDB backend.

**Live URL:** https://arthub-iota.vercel.app

## Key Features

- REST API for artworks, users, transactions, comments, and dashboards
- Role-based access control: `user` (buyer), `artist`, `admin`
- Session management via Better Auth (email/password + Google OAuth) + jose-cjs JWT (`arthub_jwt` httpOnly cookie)
- Stripe checkout sessions with transaction recording
- Per-artwork comment permission (only buyers who purchased can comment)
- Admin endpoints: user role changes, artwork management, analytics aggregation
- MongoDB seeder with demo users across all three roles

## npm Packages

| Package | Purpose |
|---|---|
| `express` | HTTP server and routing |
| `mongoose` | MongoDB ODM |
| `better-auth` | Authentication (sessions, OAuth) |
| `jose` (jose-cjs) | JWT signing and verification |
| `stripe` | Checkout session creation |
| `cors` | Cross-origin requests from the client |
| `cookie-parser` | Parse httpOnly cookies |
| `dotenv` | Environment variable loading |
| `nodemon` | Dev auto-reload |

## Run Locally

```bash
npm install
cp .env.example .env
# fill in .env (see below)
npm run dev
```

Local health check: `http://localhost:5001/api/health`

## Required Environment Variables

```bash
PORT=5001
CLIENT_URL=http://localhost:3000
BETTER_AUTH_URL=http://localhost:5001
BETTER_AUTH_SECRET=add_your_better_auth_secret
MONGO_URI=add_your_mongodb_atlas_uri
MONGO_DB_NAME=arthub
STRIPE_SECRET_KEY=sk_test_add_later
STRIPE_SUCCESS_URL=http://localhost:3000/dashboard/user?payment=success
STRIPE_CANCEL_URL=http://localhost:3000/artworks?payment=cancelled
GOOGLE_CLIENT_ID=add_later_if_google_login_required
GOOGLE_CLIENT_SECRET=add_later_if_google_login_required
```

## Main API Areas

| Prefix | Description |
|---|---|
| `/api/auth/*` | Better Auth (sign-in, sign-up, OAuth, token) |
| `/api/profile/*` | Get/update current user profile and password |
| `/api/artworks/*` | CRUD artworks, comments, comment permissions |
| `/api/dashboard/*` | Role-specific dashboard data, admin user management |
| `/api/checkout/*` | Stripe purchase flow |

## Seed Data

After MongoDB is connected:

```bash
npm run seed
```

The seed script creates sample users, artworks, and one paid transaction.

```text
Admin:  admin@arthub.com   / Admin@123
Artist: nira.artist@example.com / Artist@123
Buyer:  maya@example.com   / Buyer@123
```

## Pending Before Deployment

- Add real MongoDB Atlas URI.
- Add real Better Auth secret.
- Add Google OAuth credentials if needed.
- Add Stripe secret and webhook signing secret before real payments.
- Deploy this folder as the separate backend project.
