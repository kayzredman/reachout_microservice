# FaithReach Microservices Monorepo

## Overview

FaithReach is a multi-platform content distribution & growth SaaS for writers and pastors. This monorepo uses a microservices architecture to enable scalable, maintainable, and independent service development.

## Tech Stack

- **Monorepo Management:** pnpm, TurboRepo
- **Frontend:** Next.js (TypeScript, App Router, ESLint)
- **Backend Services:** Node.js, NestJS (TypeScript)
- **Package Management:** pnpm workspaces
- **Inter-service Communication:** REST (future: message queue/Redis)
- **Database:** (to be defined per service, e.g., PostgreSQL, MongoDB)
- **Auth:** Clerk (planned)
- **CI/CD:** (to be configured)
- **Deployment:** (to be configured)

## Services

- `services/auth` — User authentication, registration, and subscription
- `services/platform-integration` — Social platform connections and publishing
- `services/post` — Post creation, editing, scheduling, drafts
- `services/scheduler` — Scheduling and optimal time suggestions
- `services/analytics` — Analytics aggregation and reporting
- `services/content-planner` — Content planning, series, themes, drafts
- `services/ai-assistant` — AI-powered suggestions, hashtags, rewrites, engagement prediction
- `services/billing` — Subscription plans, payments, billing history
- `services/notification` — Email and push notifications
- `frontend` — Next.js app for user interface and dashboard
- `shared` — Common types, interfaces, and utilities

## Development

- Install dependencies: `pnpm install`
- Run all services and frontend in dev mode: `pnpm dev`
- Build all packages: `pnpm build`
- Lint all packages: `pnpm lint`

## Contribution

- Each service is developed independently in its own folder under `services/`
- Use pnpm workspaces for dependency management
- Use TurboRepo for running scripts across the monorepo

## Repository

- GitHub: https://github.com/kayzredman/reachout_microservice

---

> This README will be updated as the project evolves. Add service-specific details and setup instructions as you build out each service.
