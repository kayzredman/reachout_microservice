#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

errors=0

echo "🔍 Pre-flight checks…"
echo ""

# ── 1. Root .env exists with required keys ──────────────
REQUIRED_ENV=(
  CLERK_SECRET_KEY
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  OPENAI_API_KEY
)

if [ ! -f .env ]; then
  echo -e "${RED}✗ Missing .env file at project root${NC}"
  echo "  Copy from: cp .env.example .env  (then fill in values)"
  errors=$((errors + 1))
else
  for key in "${REQUIRED_ENV[@]}"; do
    val=$(grep "^${key}=" .env 2>/dev/null | cut -d= -f2-)
    if [ -z "$val" ]; then
      echo -e "${YELLOW}⚠ .env is missing ${key}${NC}"
      errors=$((errors + 1))
    fi
  done
  [ $errors -eq 0 ] && echo -e "${GREEN}✓ .env file has required keys${NC}"
fi

# ── 2. Every service has a Dockerfile ───────────────────
SERVICES=(auth user post notification analytics ai-assistant content-planner billing platform-integration scheduler payment support)
missing_dockerfiles=()
for svc in "${SERVICES[@]}"; do
  if [ ! -f "services/$svc/Dockerfile" ]; then
    missing_dockerfiles+=("$svc")
  fi
done
if [ ! -f "frontend/Dockerfile" ]; then
  missing_dockerfiles+=("frontend")
fi

if [ ${#missing_dockerfiles[@]} -gt 0 ]; then
  echo -e "${RED}✗ Missing Dockerfiles: ${missing_dockerfiles[*]}${NC}"
  errors=$((errors + 1))
else
  echo -e "${GREEN}✓ All Dockerfiles present${NC}"
fi

# ── 3. Every service has a .dockerignore ────────────────
missing_ignores=()
for svc in "${SERVICES[@]}"; do
  if [ ! -f "services/$svc/.dockerignore" ]; then
    missing_ignores+=("$svc")
  fi
done
if [ ! -f "frontend/.dockerignore" ]; then
  missing_ignores+=("frontend")
fi

if [ ${#missing_ignores[@]} -gt 0 ]; then
  echo -e "${YELLOW}⚠ Missing .dockerignore: ${missing_ignores[*]}${NC}"
else
  echo -e "${GREEN}✓ All .dockerignore files present${NC}"
fi

# ── 4. Docker daemon is running ─────────────────────────
if ! docker info >/dev/null 2>&1; then
  echo -e "${RED}✗ Docker daemon is not running${NC}"
  errors=$((errors + 1))
else
  echo -e "${GREEN}✓ Docker daemon running${NC}"
fi

echo ""

# ── Abort on critical errors ────────────────────────────
if [ $errors -gt 0 ]; then
  echo -e "${RED}Found $errors error(s). Fix them before starting.${NC}"
  exit 1
fi

# ── Start infrastructure first, wait for healthy ────────
echo "🚀 Starting infrastructure (db, redis, adminer)…"
docker compose up -d db redis adminer
echo "   Waiting for Postgres & Redis to be healthy…"
docker compose exec db sh -c 'until pg_isready -U postgres; do sleep 1; done' >/dev/null 2>&1
docker compose exec redis sh -c 'until redis-cli ping | grep -q PONG; do sleep 1; done' >/dev/null 2>&1
echo -e "${GREEN}✓ Infrastructure healthy${NC}"

# ── Ensure all databases exist ──────────────────────────
echo "📦 Ensuring databases exist…"
DBS=(faithreach_user faithreach_post faithreach_billing faithreach_notification faithreach_platform faithreach_payment faithreach_support faithreach_planner)
for db in "${DBS[@]}"; do
  docker compose exec -T db psql -U postgres -tc "SELECT 1 FROM pg_database WHERE datname='$db'" | grep -q 1 || \
    docker compose exec -T db psql -U postgres -c "CREATE DATABASE $db;" >/dev/null 2>&1
done
echo -e "${GREEN}✓ All databases ready${NC}"

# ── Start all services ──────────────────────────────────
echo "🚀 Starting all services…"
docker compose up -d --build
echo ""

# ── Health check ────────────────────────────────────────
echo "⏳ Waiting for services to start (15s)…"
sleep 15

echo ""
echo "📋 Service Status:"
echo "─────────────────────────────────────────"
PORTS=(3000 3001 3002 3003 3004 3005 3006 3007 3008 3009 3010 3011 3012)
NAMES=(frontend auth user post notification analytics ai-assistant content-planner billing platform-integration scheduler payment support)

all_ok=true
for i in "${!PORTS[@]}"; do
  port=${PORTS[$i]}
  name=${NAMES[$i]}
  if curl -sf -o /dev/null --max-time 3 "http://localhost:$port" 2>/dev/null || \
     curl -sf -o /dev/null --max-time 3 "http://localhost:$port/" 2>/dev/null; then
    printf "  ${GREEN}✓ %-25s :${port}${NC}\n" "$name"
  else
    # Check if container is at least running
    if docker compose ps "$name" 2>/dev/null | grep -q "Up"; then
      printf "  ${YELLOW}~ %-25s :${port} (running, not responding yet)${NC}\n" "$name"
    else
      printf "  ${RED}✗ %-25s :${port} (DOWN)${NC}\n" "$name"
      all_ok=false
    fi
  fi
done

echo "─────────────────────────────────────────"
if $all_ok; then
  echo -e "${GREEN}✅ All services are up! → http://localhost:3000${NC}"
else
  echo -e "${YELLOW}⚠ Some services may need attention. Check: docker compose logs <service>${NC}"
fi
