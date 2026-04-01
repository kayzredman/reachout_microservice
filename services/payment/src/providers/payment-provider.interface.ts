/**
 * Provider-agnostic payment interface.
 * Implement this for each payment gateway (Flutterwave, Stripe, Paystack, etc.)
 */

export interface InitializePaymentParams {
  txRef: string;
  amount: number;
  currency: string;
  email: string;
  orgId: string;
  tier: string;
  customerName?: string;
  redirectUrl: string;
  meta?: Record<string, string>;
}

export interface InitializePaymentResult {
  /** URL or data the frontend needs to complete payment */
  paymentLink: string;
  /** Provider-specific reference */
  providerRef: string;
  /** Raw provider response (for debugging) */
  raw?: unknown;
}

export interface VerifyPaymentResult {
  success: boolean;
  txRef: string;
  amount: number;
  currency: string;
  providerRef: string;
  customerEmail?: string;
  meta?: Record<string, string>;
}

export interface PaymentProvider {
  /** Unique name for this provider, e.g. 'flutterwave', 'stripe' */
  readonly name: string;

  /** Initialize a payment (generate checkout link / charge token) */
  initializePayment(
    params: InitializePaymentParams,
  ): Promise<InitializePaymentResult>;

  /** Verify a transaction by its provider reference or tx_ref */
  verifyPayment(transactionId: string): Promise<VerifyPaymentResult>;

  /** Validate a webhook signature. Returns true if authentic. */
  validateWebhookSignature(
    headers: Record<string, string>,
    body: unknown,
  ): boolean;
}
