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
| **Database** | PostgreSQL 15 (Docker), TypeORM                          |
| **Monorepo** | TurboRepo, pnpm workspaces                               |
| **Styling**  | CSS Modules                                              |
| **Icons**    | react-icons (Font Awesome 6)                             |
| **Runtime**  | Node.js v24                                              |

---

## Monorepo Structure

```
faithreach/
├── frontend/             # Next.js 16 dashboard app
├── services/
│   ├── ai-assistant/     # AI-powered suggestions & rewrites
│   ├── analytics/        # Analytics aggregation & reporting
│   ├── auth/             # Authentication service
│   ├── billing/          # Subscription plans & payments
│   ├── content-planner/  # Content planning, series & themes
│   ├── notification/     # Email & push notifications
│   ├── platform-integration/  # OAuth & social platform connections
│   ├── post/             # Post creation, editing & drafts
│   └── scheduler/        # Scheduling & optimal time suggestions
├── shared/               # Common types, interfaces & utilities
├── turbo.json            # TurboRepo task config
└── pnpm-workspace.yaml   # Workspace definition
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

**Settings Page** (`/settings`) — Tabbed interface with 5 sections:

- **Profile** — Edit display name, bio, and avatar
- **Team** — Clerk Organizations UI with invite flow, member list, and role management
- **Platforms** — Connect/disconnect social accounts (admin-only controls)
- **Notifications** — Notification preferences (placeholder)
- **Billing** — Subscription management (placeholder)

**Layout** — Collapsible sidebar navigation with:

- Dashboard, Posts, Planner, Scheduler, Analytics, Settings links
- User menu with profile dropdown
- Auto-hidden on landing page

**API Proxy Routes** — Next.js API routes that proxy to backend services:

- `/api/user/me` — User service proxy
- `/api/platforms/[orgId]/*` — Platform integration proxy (connect, callback, disconnect)

**OAuth Callback Page** (`/platforms/callback`) — Handles OAuth redirect flow, exchanges authorization codes with the backend.

### Backend Services

#### Platform Integration Service (Port 3009)

Fully implemented OAuth connection management:

| Platform    | Auth Method                  | Status                                           |
| ----------- | ---------------------------- | ------------------------------------------------ |
| Instagram   | Meta OAuth (Graph API v21.0) | Connected                                        |
| Facebook    | Meta OAuth (Graph API v21.0) | Connected                                        |
| X (Twitter) | OAuth 2.0 PKCE               | Connected                                        |
| YouTube     | Google OAuth 2.0             | Connected (requires test user in Google Console) |
| WhatsApp    | Phone number                 | Connected                                        |

**Key components:**

- `PlatformConnection` entity — TypeORM entity storing OAuth tokens, handles, and connection state per organization
- `PlatformService` — OAuth URL generation, token exchange (Meta, Twitter PKCE, Google), WhatsApp phone connection, disconnect logic
- `PlatformController` — REST endpoints: list connections, initiate OAuth, handle callback, disconnect
- `ClerkAuthGuard` — JWT verification guard using Clerk SDK
- `ConfigModule` — Environment-based configuration via `.env`

**Database:** `faithreach_platform` (PostgreSQL)

#### Auth Service (Port 3001)

Clerk webhook handling and JWT verification.

#### Other Services (Boilerplate)

The following services are scaffolded with NestJS but not yet implemented:

- **Post** — Post creation, editing, scheduling, drafts
- **Scheduler** — Scheduling and optimal time suggestions
- **Content Planner** — Content planning, series, themes
- **AI Assistant** — AI-powered suggestions, hashtags, rewrites
- **Analytics** — Analytics aggregation and reporting
- **Billing** — Subscription plans, payments, billing history
- **Notification** — Email and push notifications

### Authentication & RBAC

- **Clerk Organizations** — Each team is a Clerk Organization
- **Two roles:** `org:admin` and `org:member`
- **Admin-only controls:** Platform connections can only be managed by admins
- **Member profile creation:** Automatic on first login with org/role fields from Clerk
- **Custom Team UI:** Built-in invite flow, member list, and role badges (not Clerk's default components)

### Shared Package

`@faithreach/shared` — Common TypeScript types, interfaces, and utilities consumed by all services.

---

## Getting Started

### Prerequisites

- Node.js v24+
- pnpm v10+
- Docker (for PostgreSQL)
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
```

### 3. Environment Variables

**Frontend** (`frontend/.env.local`):

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
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

### 4. Run Development

```bash
# Run everything (frontend + all services)
pnpm dev

# Or run specific services
pnpm dev:profile   # frontend + user service only
```

### 5. Access

- **Frontend:** http://localhost:3000
- **Platform Integration API:** http://localhost:3009

---

## Service Ports

| Service              | Port |
| -------------------- | ---- |
| Frontend             | 3000 |
| Auth                 | 3001 |
| User                 | 3002 |
| Post                 | 3003 |
| Scheduler            | 3004 |
| Content Planner      | 3005 |
| Analytics            | 3006 |
| AI Assistant         | 3007 |
| Notification         | 3008 |
| Platform Integration | 3009 |
| Billing              | 3010 |

---

## Scripts

| Command            | Description                             |
| ------------------ | --------------------------------------- |
| `pnpm dev`         | Run all services + frontend in dev mode |
| `pnpm dev:profile` | Run frontend + user service only        |
| `pnpm build`       | Build all packages                      |
| `pnpm lint`        | Lint all packages                       |

---

## Roadmap

- [ ] **Publisher** — Core post creation/publishing using stored OAuth tokens
- [ ] **Scheduler** — Queue and schedule posts with optimal timing
- [ ] **Content Planner** — Calendar view, series management, content themes
- [ ] **AI Assistant** — Caption generation, hashtag suggestions, engagement prediction
- [ ] **Analytics** — Cross-platform metrics dashboard
- [ ] **Notifications** — Email and in-app notification system
- [ ] **Billing** — Stripe integration for subscription plans

---

## Contributing

- Each service is developed independently under `services/`
- Use pnpm workspaces for dependency management
- TurboRepo handles task orchestration across the monorepo
- Follow existing CSS Modules patterns for frontend styling

## Repository

GitHub: https://github.com/kayzredman/reachout_microservice

---

> This README will be updated as the project evolves. Add service-specific details and setup instructions as you build out each service.
