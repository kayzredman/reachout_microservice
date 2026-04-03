#!/bin/bash
# Start all FaithReach backend services
set -e
cd "$(dirname "$0")/.."

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

# Start Redis if not running
redis-cli ping > /dev/null 2>&1 || redis-server --daemonize yes

echo "Starting services..."

services=(analytics:3005 post:3003 platform-integration:3009 user:3002 billing:3008 notification:3004 payment:3011 support:3012 ai-assistant:3006)

for entry in "${services[@]}"; do
  svc="${entry%%:*}"
  port="${entry##*:}"
  
  # Skip if already running
  if lsof -i:"$port" -P 2>/dev/null | grep -q LISTEN; then
    echo "  $svc already running on :$port"
    continue
  fi
  
  echo "  Starting $svc on :$port..."
  nohup node "services/$svc/dist/main.js" > "/tmp/fr-$svc.log" 2>&1 &
done

echo "Waiting for services to initialize..."
sleep 8

echo ""
echo "Service Status:"
for entry in "${services[@]}"; do
  svc="${entry%%:*}"
  port="${entry##*:}"
  if lsof -i:"$port" -P 2>/dev/null | grep -q LISTEN; then
    echo "  ✓ $svc :$port"
  else
    echo "  ✗ $svc :$port FAILED — check /tmp/fr-$svc.log"
  fi
done
