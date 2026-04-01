# FaithReach

**Multi-platform content distribution & growth SaaS for writers and pastors.**

FaithReach helps faith-based creators manage, schedule, and publish content across multiple social platforms from a single dashboard. Built as a microservices monorepo with a modern stack.

---

## Tech Stack

| Layer            | Technology                                               |
| ---------------- | -------------------------------------------------------- |
| **Frontend**     | Next.js 16 (App Router, Turbopack), React 19, TypeScript |
| **Backend**      | NestJS 11, TypeScript (11 microservices)                 |
| **Auth**         | Clerk (Organizations, RBAC)                              |
| **Database**     | PostgreSQL 15, TypeORM                                   |
| **WhatsApp**     | Baileys (QR-based multi-device protocol)                 |
| **AI**           | OpenAI GPT-4o-mini (captions, hashtags, content plans)   |
| **Payments**     | Flutterwave (Card + Mobile Money), multi-currency        |
| **Billing**      | Tiered subscriptions (Starter / Creator / Ministry Pro)  |
| **YouTube**      | YouTube Data API v3                                      |
| **Social APIs**  | Meta Graph API v21.0, X API v2 (OAuth 2.0 PKCE)         |
| **Monorepo**     | TurboRepo, pnpm workspaces                               |
| **Styling**      | CSS Modules                                              |
| **Icons**        | react-icons (Font Awesome 6)                             |
| **Containers**   | Docker, Docker Compose                                   |
| **Runtime**      | Node.js v24                                              |

---

## Monorepo Structure

```
faithreach/
├── frontend/                  # Next.js 16 dashboard app (port 3000)
├── services/
│   ├── auth/                  # Clerk webhooks & JWT verification (port 3001)
│   ├── user/                  # User profiles & management (port 3002) [DB]
│   ├── post/                  # Post CRUD, publishing, scheduling, metrics (port 3003) [DB]
│   ├── notification/          # Notification preferences (port 3004) [DB]
│   ├── analytics/             # Analytics aggregation (port 3005) [scaffold]
│   ├── ai-assistant/          # AI captions, hashtags, rewrites (port 3006)
│   ├── content-planner/       # Template engine & AI content plans (port 3007)
│   ├── billing/               # Subscription tiers & limits (port 3008) [DB]
│   ├── platform-integration/  # OAuth, WhatsApp Baileys, publishing (port 3009) [DB]
│   ├── scheduler/             # Cron scheduling & optimal times (port 3010)
│   └── payment/               # Flutterwave payments & MoMo (port 3011) [DB]
├── shared/                    # @faithreach/shared — common types & utilities
├── scripts/
│   └── init-databases.sh      # Auto-create all PostgreSQL databases
├── docker-compose.yaml        # Full stack orchestration
├── turbo.json                 # TurboRepo task config
└── pnpm-workspace.yaml        # Workspace definition
```

---

## Service Architecture

| Service              | Port | Database               | Status      |
| -------------------- | ---- | ---------------------- | ----------- |
| Frontend             | 3000 | —                      | Implemented |
| Auth                 | 3001 | —                      | Scaffold    |
| User                 | 3002 | `faithreach_user`      | Implemented |
| Post                 | 3003 | `faithreach_post`      | Implemented |
| Notification         | 3004 | `faithreach_notification` | Implemented |
| Analytics            | 3005 | —                      | Scaffold    |
| AI Assistant         | 3006 | —                      | Implemented |
| Content Planner      | 3007 | —                      | Implemented |
| Billing              | 3008 | `faithreach_billing`   | Implemented |
| Platform Integration | 3009 | `faithreach_platform`  | Implemented |
| Scheduler            | 3010 | —                      | Implemented |
| Payment              | 3011 | `faithreach_payment`   | Implemented |

All services use `process.env.PORT` with sensible defaults and `process.env.FRONTEND_URL` for CORS.

---

## What's Built

### Frontend (Next.js 16)

**Landing Page** — Split-panel design with branded sign-in/sign-up CTAs and animated sliding auth panel.

**Authentication** — Fully integrated Clerk auth pages (not external redirects):

- `/sign-in` and `/sign-up` with custom branded sliding panel design
- Route protection via Clerk middleware
- Organization-aware sessions

**Dashboard** — Main authenticated view at `/dashboard` with analytics overview cards, recent posts, and platform status.

**Profile Page** — User profile management at `/profile` with CSS Modules styling.

**Post Publisher** (`/post`) — Full content creation and multi-platform publishing:

- Rich text editor with character counts
- Image upload with drag-and-drop, paste, and URL support
- Platform selector (Instagram, Facebook, X/Twitter, YouTube, WhatsApp)
- Live platform previews (tabbed: Instagram, X, Facebook, WhatsApp)
- AI-powered rewrite (tone selector) and hashtag generation (Growth/Pro tiers)
- WhatsApp broadcast mode: upload CSV of phone numbers for mass messaging
- WhatsApp direct mode: single message to connected phone
- Per-platform publish results with success/failure indicators
- Edit mode for existing draft posts
- Series linking from planner

**Content Library** (`/content`) — Browse and manage all posts with status filtering and search.

**Content Planner** (`/planner`) — Calendar-based content planning:

- Template-based plan generation (sermon series, devotionals, events, etc.)
- AI-powered content plan generation (premium tiers)
- Series management (create, edit, delete series with themes)
- Commit plans to create series + draft posts in one action
- Link posts to series with ordering
- Week/month views

**Scheduler** — Schedule posts for future publishing with optimal time suggestions.

**Analytics** (`/analytics`) — Dashboard with engagement metrics, platform breakdowns, and post performance charts.

**Settings Page** (`/settings`) — Tabbed interface with 5 sections:

- **Profile** — Edit display name, bio, and avatar
- **Team** — Clerk Organizations UI with invite flow, member list, and role management
- **Platforms** — Connect/disconnect social accounts (admin-only controls), WhatsApp QR pairing, connection status indicators
- **Notifications** — Toggle notification preferences (post published, scheduled reminders, team activity, weekly digest, platform alerts, billing updates)
- **Billing** — Subscription tier cards (Starter/Creator/Ministry Pro), current plan indicator, upgrade via payment checkout

**Layout** — Collapsible sidebar navigation with:

- Dashboard, Posts, Planner, Scheduler, Analytics, Settings links
- User menu with profile dropdown
- Auto-hidden on landing page

**API Proxy Routes** — Next.js API routes that proxy to backend services:

| Route Pattern                            | Backend Service       |
| ---------------------------------------- | --------------------- |
| `/api/user/me`                           | User (3002)           |
| `/api/platforms/[orgId]/*`               | Platform Int. (3009)  |
| `/api/posts/[orgId]/*`                   | Post (3003)           |
| `/api/series/[orgId]/*`                  | Post (3003)           |
| `/api/metrics/[orgId]/*`                 | Post (3003)           |
| `/api/ai/rewrite`                        | AI Assistant (3006)   |
| `/api/ai/hashtags`                       | AI Assistant (3006)   |
| `/api/ai/can-use/[orgId]`               | Billing (3008)        |
| `/api/planner/templates`                 | Content Planner (3007)|
| `/api/planner/[orgId]/generate`          | Content Planner (3007)|
| `/api/planner/[orgId]/generate-ai`       | Content Planner (3007)|
| `/api/planner/[orgId]/can-use-ai`        | Content Planner (3007)|
| `/api/planner/[orgId]/commit`            | Content Planner (3007)|
| `/api/billing/[orgId]`                   | Billing (3008)        |
| `/api/billing/[orgId]/limits`            | Billing (3008)        |
| `/api/notifications/[orgId]/preferences` | Notification (3004)   |
| `/api/payment/initialize`                | Payment (3011)        |
| `/api/payment/verify/[txRef]`            | Payment (3011)        |
| `/api/payment/charge/momo`               | Payment (3011)        |
| `/api/payment/validate-momo`             | Payment (3011)        |
| `/api/payment/pricing`                   | Payment (3011)        |
| `/api/payment/history/[orgId]`           | Payment (3011)        |

**Payment Checkout** (`/payment/checkout`) — Custom payment page:

- Card payments via Flutterwave Inline modal
- Mobile Money (MTN MoMo, Telecel Cash, AirtelTigo Money) via Direct Charge API
- Multi-currency support: GHS, NGN, KES, USD with local pricing
- Ghana telco branded SVG icons (MTN, Telecel, AirtelTigo)
- MoMo popup redirect flow with polling for payment completion
- Automatic billing tier upgrade on successful payment
- Payment callback page with transaction verification

**OAuth Callback Page** (`/platforms/callback`) — Handles OAuth redirect flow, exchanges authorization codes with the backend.

### Backend Services

#### Platform Integration Service (Port 3009)

Full OAuth connection management and content publishing to all platforms:

| Platform    | Auth Method                  | Publishing                                    | Status  |
| ----------- | ---------------------------- | --------------------------------------------- | ------- |
| Instagram   | Meta OAuth (Graph API v21.0) | Photo + caption via Graph API                 | Working |
| Facebook    | Meta OAuth (Graph API v21.0) | Text + image posts via Pages API              | Working |
| X (Twitter) | OAuth 2.0 PKCE               | Tweets via X API v2 (with auto token refresh) | Working |
| YouTube     | Google OAuth 2.0             | Activity bulletins via YouTube Data API v3     | Working |
| WhatsApp    | Baileys QR Code              | Direct message + CSV broadcast                | Working |

**WhatsApp Integration (Baileys):**

- QR code pairing via `@whiskeysockets/baileys` (free, no Meta Business API needed)
- Session persistence in `.wa-sessions/{orgId}/` via `useMultiFileAuthState`
- Auto-restore sessions on service restart
- Auto-reconnect on non-logout disconnections
- Direct message publishing (send to own number)
- CSV broadcast: upload phone list, validate numbers, send to all with delivery tracking
- Real-time message status updates (sent → delivered → read) via `messages.update` events
- Broadcast logs with per-recipient status stored in PostgreSQL

**Key components:**

- `PlatformConnection` entity — OAuth tokens, handles, phone numbers, and connection state per organization
- `PlatformService` — OAuth flows, token exchange/refresh, multi-platform publishing, YouTube token auto-refresh
- `WhatsAppSessionService` — Baileys session lifecycle, QR generation, connection management
- `BroadcastService` — CSV validation, mass message sending, delivery tracking
- `BroadcastLog` / `BroadcastRecipient` entities — Broadcast history and per-recipient status
- `PlatformController` — REST endpoints for all platform operations
- `ClerkAuthGuard` — JWT verification guard using Clerk SDK

**Database:** `faithreach_platform` (PostgreSQL)

#### Post Service (Port 3003)

Full post lifecycle management and multi-platform publish orchestration:

- **Post CRUD** — Create, read, update, delete draft posts
- **Multi-platform publishing** — Parallel publish to all selected platforms via `Promise.allSettled`
- **Per-platform results** — Track success/failure per platform with error messages
- **Scheduling** — Schedule posts for future publishing with cron-based execution
- **Series management** — Create content series, link posts, manage ordering
- **Post metrics** — Track views, likes, shares, comments per post per platform
- **Metrics history** — Time-series engagement data per post
- **Broadcast integration** — WhatsApp broadcast mode skips re-publishing (already sent from frontend)

**Key components:**

- `PostEntity` — Content, platforms, status, publishResults, broadcastMode/broadcastId
- `SeriesEntity` — Series with themes, descriptions, ordering
- `PostMetrics` — Per-platform engagement metrics
- `PostService` — CRUD, publish orchestration, scheduling
- `MetricsService` — Metrics aggregation and history

**Database:** `faithreach_post` (PostgreSQL)

#### User Service (Port 3002)

User profile management with auto-creation on first login:

- **Profile CRUD** — Get/update user profile (display name, bio, avatar)
- **Auto-create** — Creates profile from Clerk user data on first request
- **Org-aware** — Stores organization and role context from Clerk JWT

**Database:** `faithreach_user` (PostgreSQL)

#### AI Assistant Service (Port 3006)

AI-powered content tools using OpenAI GPT-4o-mini:

- **Rewrite** — Rewrite post content in different tones (professional, casual, inspirational, etc.)
- **Hashtags** — Generate relevant hashtags for post content
- Tier-gated via billing service (Growth/Pro tiers only)

#### Content Planner Service (Port 3007)

Template engine and AI-powered content plan generation:

- **Templates** — Built-in templates (Sermon Series, Daily Devotional, Event Promotion, Seasonal, Awareness Month, Scripture Study)
- **Plan generation** — Generate content plans from templates with customizable date ranges
- **AI plans** — Generate full content plans via OpenAI (premium tiers)
- **Commit** — Convert plans into series + draft posts via Post service
- Tier-gated AI features via billing service

#### Billing Service (Port 3008)

Subscription management with persistent PostgreSQL storage:

- **Three tiers:** Starter (free), Creator, Ministry Pro
- **Tier limits** — Max series, posts/month, AI plans/month per tier
- **Feature gating** — `can-use` endpoints for AI rewrite, AI plans, advanced analytics
- **Auto-provisioning** — Creates starter subscription on first request
- **Persistent** — TypeORM entity with subscription state, tier, period end dates

**Database:** `faithreach_billing` (PostgreSQL)

#### Notification Service (Port 3004)

Notification preference management:

- **6 preference toggles** — Post published, scheduled reminders, team activity, weekly digest, platform alerts, billing updates
- **Per-user, per-org** — Preferences scoped to organization and user
- **Defaults** — Sensible defaults on first access (all enabled except weekly digest)
- **REST API** — GET/PUT preferences with ClerkAuthGuard

**Database:** `faithreach_notification` (PostgreSQL)

#### Scheduler Service (Port 3010)

Cron-based post scheduling with auto-publish:

- Polls for scheduled posts and triggers publishing at scheduled times
- Works with Post service for publish orchestration

#### Payment Service (Port 3011)

Provider-agnostic payment processing with Flutterwave integration:

- **Card payments** — Flutterwave Inline modal (Visa, Mastercard, Verve)
- **Mobile Money** — Direct Charge API for Ghana networks (MTN, Telecel, AirtelTigo)
- **Multi-currency** — GHS, NGN, KES, USD with per-currency tier pricing
- **Provider pattern** — `PaymentProvider` interface with `FlutterwaveProvider` implementation
- **Payment verification** — Verify by transaction reference with Flutterwave API
- **Webhook support** — Flutterwave webhook endpoint with hash verification
- **Billing integration** — Auto-upgrade org tier on successful payment via billing service
- **Payment history** — Track all payments per organization

**Tier Pricing:**

| Tier          | USD    | GHS    | NGN      | KES      |
| ------------- | ------ | ------ | -------- | -------- |
| Creator       | $9.99  | GHS 120| ₦8,000   | KSh 1,300|
| Ministry Pro  | $29.99 | GHS 350| ₦24,000  | KSh 3,900|

**Database:** `faithreach_payment` (PostgreSQL)

#### Auth Service (Port 3001) — *Scaffold*

Clerk webhook handling endpoint. Authentication is handled directly by Clerk SDK in each service via `ClerkAuthGuard`.

#### Analytics Service (Port 3005) — *Scaffold*

Scaffolded for future cross-platform analytics aggregation. Current metrics are served by the Post service.

### Authentication & RBAC

- **Clerk Organizations** — Each team is a Clerk Organization
- **Two roles:** `org:admin` and `org:member`
- **Admin-only controls:** Platform connections can only be managed by admins
- **Member profile creation:** Automatic on first login with org/role fields from Clerk
- **Custom Team UI:** Built-in invite flow, member list, and role badges (not Clerk's default components)
- **Service-to-service auth:** Clerk JWTs are forwarded from frontend → post service → platform-integration

### Shared Package

`@faithreach/shared` — Common TypeScript types, interfaces, and utilities consumed by all services.

---

## Getting Started

### Prerequisites

- Node.js v24+
- pnpm v10+
- Docker & Docker Compose (for full stack) or PostgreSQL 15 (for local dev)
- Clerk account with Organizations enabled

### Option A: Docker Compose (Full Stack)

```bash
# Clone and install
pnpm install

# Start everything (Postgres + all services + frontend)
docker compose up --build
```

This starts PostgreSQL with all 5 databases auto-created, Supabase Studio for DB browsing, all 10 backend services, and the frontend.

### Option B: Local Development

#### 1. Install Dependencies

```bash
pnpm install
```

#### 2. Start PostgreSQL

```bash
docker run --name faithreach-db -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:15
```

Create the required databases:

```bash
docker exec -it faithreach-db psql -U postgres -c "CREATE DATABASE faithreach_user;"
docker exec -it faithreach-db psql -U postgres -c "CREATE DATABASE faithreach_platform;"
docker exec -it faithreach-db psql -U postgres -c "CREATE DATABASE faithreach_post;"
docker exec -it faithreach-db psql -U postgres -c "CREATE DATABASE faithreach_billing;"
docker exec -it faithreach-db psql -U postgres -c "CREATE DATABASE faithreach_notification;"
docker exec -it faithreach-db psql -U postgres -c "CREATE DATABASE faithreach_payment;"
```

> TypeORM auto-creates tables via `synchronize: true` in development.

#### 3. Build & Run Services

```bash
# Build a service
cd services/<service-name>
./node_modules/.bin/nest build

# Run a service
node dist/main.js

# Run frontend
cd frontend
pnpm dev
```

### Environment Variables

**Frontend** (`frontend/.env.local`):

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/sign-up
```

**Post Service** (`services/post/.env`):

```env
CLERK_SECRET_KEY=sk_test_...
PLATFORM_SERVICE_URL=http://localhost:3009
```

**Platform Integration** (`services/platform-integration/.env`):

```env
CLERK_SECRET_KEY=sk_test_...
FRONTEND_URL=http://localhost:3000

# Meta (Instagram & Facebook)
META_APP_ID=your_meta_app_id
META_APP_SECRET=your_meta_app_secret

# X (Twitter)
TWITTER_CLIENT_ID=your_twitter_client_id
TWITTER_CLIENT_SECRET=your_twitter_client_secret

# Google (YouTube)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

**AI Assistant** (`services/ai-assistant/.env`):

```env
OPENAI_API_KEY=sk-...
BILLING_SERVICE_URL=http://localhost:3008
```

**Content Planner** (`services/content-planner/.env`):

```env
OPENAI_API_KEY=sk-...
BILLING_SERVICE_URL=http://localhost:3008
POST_SERVICE_URL=http://localhost:3003
```

**Billing** (`services/billing/.env`):

```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/faithreach_billing
```

**Notification** (`services/notification/.env`):

```env
CLERK_SECRET_KEY=sk_test_...
DATABASE_URL=postgres://postgres:postgres@localhost:5432/faithreach_notification
```

**Payment** (`services/payment/.env`):

```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=faithreach_payment
PORT=3011
BILLING_SERVICE_URL=http://localhost:3008
PAYMENT_PROVIDER=flutterwave
FLW_PUBLIC_KEY=FLWPUBK_TEST-...
FLW_SECRET_KEY=FLWSECK_TEST-...
FLW_WEBHOOK_HASH=your_webhook_hash
```

**Frontend** — also needs:

```env
NEXT_PUBLIC_FLW_PUBLIC_KEY=FLWPUBK_TEST-...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Access

| Service              | URL                          |
| -------------------- | ---------------------------- |
| Frontend             | http://localhost:3000         |
| Adminer (DB Browser) | http://localhost:8080         |
| Auth API             | http://localhost:3001         |
| User API             | http://localhost:3002         |
| Post API             | http://localhost:3003         |
| Notification API     | http://localhost:3004         |
| Analytics API        | http://localhost:3005         |
| AI Assistant API     | http://localhost:3006         |
| Content Planner API  | http://localhost:3007         |
| Billing API          | http://localhost:3008         |
| Platform Int. API    | http://localhost:3009         |
| Scheduler API        | http://localhost:3010         |
| Payment API          | http://localhost:3011         |

---

## Docker

The project includes a complete Docker Compose setup for local development and deployment.

**What's included:**

- **PostgreSQL 15** with healthchecks and auto-database creation (6 databases via `init-databases.sh`)
- **Adminer** on port 8080 for visual database management
- **All 11 NestJS services** with multi-stage builds (`node:20-alpine`)
- **Next.js frontend** with production build
- **Service dependencies** — Services wait for Postgres health before starting
- **Inter-service networking** — Services communicate via Docker service names

**Dockerfiles** are located in each service directory and in `frontend/`.

```bash
# Start full stack
docker compose up --build

# Start specific services
docker compose up db platform-integration post frontend

# View logs for a service
docker compose logs -f post
```

---

## Databases

| Database                  | Service              | Tables                                    |
| ------------------------- | -------------------- | ----------------------------------------- |
| `faithreach_user`         | User (3002)          | user profiles                             |
| `faithreach_post`         | Post (3003)          | posts, series, post_metrics               |
| `faithreach_platform`     | Platform Int. (3009) | connections, broadcast_logs, recipients    |
| `faithreach_billing`      | Billing (3008)       | subscriptions                             |
| `faithreach_notification` | Notification (3004)  | notification_preferences                  |
| `faithreach_payment`      | Payment (3011)       | payments                                  |

All databases use TypeORM with `synchronize: true` — tables are auto-created on service startup.

---

## Scripts

| Command      | Description                             |
| ------------ | --------------------------------------- |
| `pnpm dev`   | Run all services + frontend in dev mode |
| `pnpm build` | Build all packages                      |
| `pnpm lint`  | Lint all packages                       |

---

## Roadmap

- [x] **Platform Connections** — OAuth integration for Instagram, Facebook, X/Twitter, YouTube
- [x] **WhatsApp Integration** — Baileys QR-based pairing, session persistence, direct messaging
- [x] **Publisher** — Multi-platform content publishing with per-platform results
- [x] **WhatsApp Broadcasting** — CSV-based mass messaging with delivery tracking
- [x] **Content Library** — Browse, search, and manage all posts
- [x] **Content Planner** — Template engine, AI plan generation, series commit
- [x] **Post Scheduling** — Schedule posts for future publishing with cron
- [x] **Post Metrics** — Per-platform engagement tracking and history
- [x] **YouTube Publishing** — Activity bulletins via YouTube Data API v3
- [x] **AI Assistant** — Caption rewrite, hashtag generation (GPT-4o-mini)
- [x] **Billing** — Tiered subscriptions (Starter/Growth/Pro) with feature gating
- [x] **Notifications** — Notification preference management (6 toggles)
- [x] **Docker** — Full Docker Compose setup with all services
- [x] **Dashboard & Analytics** — Overview cards, charts, platform breakdowns
- [x] **Flutterwave Payments** — Card + Mobile Money (MTN, Telecel, AirtelTigo), multi-currency
- [x] **Payment Checkout** — Custom checkout page with GHS/NGN/KES/USD pricing
- [ ] **Email Notifications** — Actual email sending via notification service
- [ ] **Analytics Service** — Real aggregation in analytics backend (currently scaffold)
- [ ] **Unit Tests** — Comprehensive test coverage across services

---

## Development Notes

### Rebuilding Services

NestJS services run from compiled `dist/` — always rebuild after editing source:

```bash
cd services/<service-name>
./node_modules/.bin/nest build
```

### WhatsApp (Baileys) Notes

- Baileys requires a `pino` logger instance (never pass `undefined`)
- Sessions persist in `.wa-sessions/{orgId}/` and auto-restore on startup
- WhatsApp status values: `"connected"`, `"disconnected"`, `"qr"`, `"connecting"`
- Broadcasting sends individual messages (not group messages)

### OAuth Setup

- **Meta (Instagram/Facebook):** Create app at developers.facebook.com → configure OAuth redirect to `http://localhost:3000/platforms/callback`
- **X (Twitter):** Create app at developer.x.com → enable OAuth 2.0 with PKCE → redirect to `http://localhost:3000/platforms/callback`
- **Google (YouTube):** Create app at console.cloud.google.com → enable YouTube Data API v3 → OAuth redirect to `http://localhost:3000/platforms/callback`

### Common Issues

- **EADDRINUSE on restart:** Kill the old process first: `lsof -ti:<PORT> | xargs kill -9`
- **`useSearchParams()` build error:** Wrap pages using it in `<Suspense>`
- **Auth token flow:** Frontend → Next.js API route → backend service (Clerk JWT forwarded as-is)

---

## Contributing

- Each service is developed independently under `services/`
- Use pnpm workspaces for dependency management
- TurboRepo handles task orchestration across the monorepo
- Follow existing CSS Modules patterns for frontend styling

## Repository

GitHub: https://github.com/kayzredman/reachout_microservice
