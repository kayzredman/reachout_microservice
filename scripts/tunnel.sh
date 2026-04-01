#!/bin/bash
# Start a localtunnel for the payment service webhook
# Usage: ./scripts/tunnel.sh
#
# Copy the printed webhook URL into your Flutterwave dashboard:
#   Dashboard → Settings → Webhooks

PORT=${1:-3011}

echo "Starting tunnel for payment service (port $PORT)..."
echo ""

lt --port "$PORT" 2>&1 | while IFS= read -r line; do
  if [[ "$line" == *"your url is:"* ]]; then
    URL=$(echo "$line" | sed 's/.*your url is: //')
    echo "════════════════════════════════════════════════════════"
    echo "  Tunnel URL:   $URL"
    echo "  Webhook URL:  $URL/payment/webhook/flutterwave"
    echo "════════════════════════════════════════════════════════"
    echo ""
    echo "Paste this webhook URL into Flutterwave Dashboard → Settings → Webhooks"
    echo "Press Ctrl+C to stop the tunnel"
  else
    echo "$line"
  fi
done
