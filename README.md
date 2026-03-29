# FaithReach

**Multi-platform content distribution & growth SaaS for writers and pastors.**

FaithReach helps faith-based creators manage, schedule, and publish content across multiple social platforms from a single dashboard. Built as a microservices monorepo with a modern stack.

---

## Tech Stack

| Layer        | Technology                                               |
| ------------ | -------------------------------------------------------- |
| **Frontend** | Next.js 16 (App Router, Turbopack), React 19, TypeScript |
| **Backend**  | NestJS 11, TypeScript                                    |
| **Auth**     | Clerk (Organizations, RBAC)                              |
| **Database** | PostgreSQL 15, TypeORM                                   |
| **WhatsApp** | Baileys (QR-based multi-device protocol)                 |
| **Monorepo** | TurboRepo, pnpm workspaces                               |
| **Styling**  | CSS Modules                                              |
| **Icons**    | react-icons (Font Awesome 6)                             |
| **Runtime**  | Node.js v24                                              |

---

## Monorepo Structure

```
faithreach/
├── frontend/                  # Next.js 16 dashboard app
├── services/
│   ├── ai-assistant/          # AI-powered suggestions & rewrites
│   ├── analytics/             # Analytics aggregation & reporting
│   ├── auth/                  # Authentication & Clerk webhooks
│   ├── billing/               # Subscription plans & payments
│   ├── content-planner/       # Content planning, series & themes
│   ├── notification/          # Email & push notifications
│   ├── platform-integration/  # OAuth, WhatsApp Baileys, publishing & broadcasting
│   ├── post/                  # Post CRUD, publishing orchestration, scheduling & metrics
│   └── scheduler/             # Scheduling & optimal time suggestions
├── shared/                    # Common types, interfaces & utilities
├── turbo.json                 # TurboRepo task config
└── pnpm-workspace.yaml        # Workspace definition
```

---

## What's Built

### Frontend (Next.js 16)

**Landing Page** — Split-panel design with branded sign-in/sign-up CTAs.

**Authentication** — Fully integrated Clerk auth pages (not external redirects):

- `/sign-in` and `/sign-up` with custom branded styling
- Route protection via Clerk middleware
- Organization-aware sessions

**Dashboard** — Main authenticated view at `/dashboard`.

**Profile Page** — User profile management at `/profile` with CSS Modules styling.

**Post Publisher** (`/post`) — Full content creation and multi-platform publishing:

- Rich text editor with character counts
- Image upload with drag-and-drop, paste, and URL support
- Platform selector (Instagram, Facebook, X/Twitter, WhatsApp)
- Live platform previews (tabbed: Instagram, X, Facebook, WhatsApp)
- WhatsApp broadcast mode: upload CSV of phone numbers for mass messaging
- WhatsApp direct mode: single message to connected phone
- Per-platform publish results with success/failure indicators
- Edit mode for existing draft posts
- Series linking from planner

**Content Library** (`/content`) — Browse and manage all posts with status filtering and search.

**Content Planner** (`/planner`) — Calendar-based content planning:

- Series management (create, edit, delete series with themes)
- Drag content slots to schedule
- Link posts to series with ordering
- Week/month views

**Scheduler** — Schedule posts for future publishing with optimal time suggestions.

**Settings Page** (`/settings`) — Tabbed interface with 5 sections:

- **Profile** — Edit display name, bio, and avatar
- **Team** — Clerk Organizations UI with invite flow, member list, and role management
- **Platforms** — Connect/disconnect social accounts (admin-only controls), WhatsApp QR pairing
- **Notifications** — Notification preferences (placeholder)
- **Billing** — Subscription management (placeholder)

**Layout** — Collapsible sidebar navigation with:

- Dashboard, Posts, Planner, Scheduler, Analytics, Settings links
- User menu with profile dropdown
- Auto-hidden on landing page

**API Proxy Routes** — Next.js API routes that proxy to backend services:

- `/api/user/me` — User service proxy
- `/api/platforms/[orgId]/*` — Platform integration proxy (connect, callback, disconnect, WhatsApp status/QR, broadcast)
- `/api/posts/[orgId]/*` — Post CRUD, publish, schedule
- `/api/series/[orgId]/*` — Series management
- `/api/metrics/[orgId]/*` — Post metrics

**OAuth Callback Page** (`/platforms/callback`) — Handles OAuth redirect flow, exchanges authorization codes with the backend.

### Backend Services

#### Platform Integration Service (Port 3009)

Full OAuth connection management and content publishing to all platforms:

| Platform    | Auth Method                  | Publishing                               | Status    |
| ----------- | ---------------------------- | ---------------------------------------- | --------- |
| Instagram   | Meta OAuth (Graph API v21.0) | Photo + caption via Graph API            | Working   |
| Facebook    | Meta OAuth (Graph API v21.0) | Text + image posts via Pages API         | Working   |
| X (Twitter) | OAuth 2.0 PKCE               | Tweets via X API v2 (with token refresh) | Working   |
| YouTube     | Google OAuth 2.0             | Planned                                  | Connected |
| WhatsApp    | Baileys QR Code              | Direct message + CSV broadcast           | Working   |

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
- `PlatformService` — OAuth flows, token exchange/refresh, multi-platform publishing
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
- **Broadcast integration** — WhatsApp broadcast mode skips re-publishing (already sent from frontend)

**Key components:**

- `PostEntity` — Content, platforms, status, publishResults, broadcastMode/broadcastId
- `SeriesEntity` — Series with themes, descriptions, ordering
- `PostMetrics` — Per-platform engagement metrics
- `PostService` — CRUD, publish orchestration, scheduling
- `MetricsService` — Metrics aggregation and history

**Database:** `faithreach_post` (PostgreSQL)

#### Auth Service (Port 3001)

Clerk webhook handling and JWT verification.

#### Other Services (Scaffolded)

The following services are scaffolded with NestJS and ready for implementation:

- **Scheduler** (Port 3004) — Advanced scheduling with optimal time suggestions
- **Analytics** (Port 3005) — Cross-platform analytics aggregation and reporting
- **Content Planner** (Port 3006) — Backend for content planning workflows
- **Billing** (Port 3007) — Subscription plans, payments, billing history
- **Notification** (Port 3008) — Email and push notifications
- **AI Assistant** — AI-powered suggestions, hashtags, rewrites

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
- PostgreSQL 15 (local or Docker)
- Clerk account with Organizations enabled

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Start PostgreSQL

```bash
docker run --name faithreach-db -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:15
```

Create the required databases:

```bash
docker exec -it faithreach-db psql -U postgres -c "CREATE DATABASE faithreach_user;"
docker exec -it faithreach-db psql -U postgres -c "CREATE DATABASE faithreach_platform;"
docker exec -it faithreach-db psql -U postgres -c "CREATE DATABASE faithreach_post;"
```

> TypeORM auto-creates tables via `synchronize: true` in development.

### 3. Environment Variables

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

### 4. Build & Run Services

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

### 5. Access

- **Frontend:** http://localhost:3000
- **Post Service API:** http://localhost:3003
- **Platform Integration API:** http://localhost:3009

---

## Service Ports

| Service              | Port | Database            | Status      |
| -------------------- | ---- | ------------------- | ----------- |
| Frontend             | 3000 | —                   | Implemented |
| Auth                 | 3001 | faithreach_auth     | Implemented |
| Post                 | 3003 | faithreach_post     | Implemented |
| Notification         | 3004 | —                   | Scaffolded  |
| Analytics            | 3005 | —                   | Scaffolded  |
| Content Planner      | 3006 | —                   | Scaffolded  |
| Billing              | 3007 | —                   | Scaffolded  |
| Notification         | 3008 | —                   | Scaffolded  |
| Platform Integration | 3009 | faithreach_platform | Implemented |

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
- [x] **Content Planner** — Series management and calendar-based planning
- [x] **Post Scheduling** — Schedule posts for future publishing
- [x] **Post Metrics** — Per-platform engagement tracking
- [ ] **Analytics Dashboard** — Cross-platform metrics visualization
- [ ] **AI Assistant** — Caption generation, hashtag suggestions, engagement prediction
- [ ] **Notifications** — Email and in-app notification system
- [ ] **Billing** — Stripe integration for subscription plans
- [ ] **YouTube Publishing** — Video/community post publishing via YouTube Data API

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
