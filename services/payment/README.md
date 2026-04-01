# Payment Service

Standalone payment processing microservice for FaithReach.

**Port:** 3011

## Architecture

Provider-agnostic design — implement `PaymentProvider` interface for any gateway:

```
src/
├── providers/
│   ├── payment-provider.interface.ts   ← Contract
│   └── flutterwave.provider.ts         ← First implementation
├── payment.entity.ts                    ← Transaction log
├── payment.service.ts                   ← Orchestrator
├── payment.controller.ts               ← REST endpoints
└── payment.module.ts
```

## Endpoints

| Method | Path                           | Description                    |
| ------ | ------------------------------ | ------------------------------ |
| POST   | `/payment/initialize`          | Start a checkout session       |
| POST   | `/payment/webhook/flutterwave` | Flutterwave webhook receiver   |
| GET    | `/payment/verify/:txRef`       | Check payment status by tx_ref |
| GET    | `/payment/history/:orgId`      | Get payment history for an org |

## Adding a New Provider

1. Create `src/providers/your-provider.provider.ts` implementing `PaymentProvider`
2. Register it in `PaymentService.onModuleInit()`
3. Add env keys to `.env`

## Environment Variables

```env
PORT=3011
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=faithreach_payment
BILLING_SERVICE_URL=http://localhost:3008
PAYMENT_PROVIDER=flutterwave
FLW_SECRET_KEY=
FLW_PUBLIC_KEY=
FLW_WEBHOOK_HASH=
```
