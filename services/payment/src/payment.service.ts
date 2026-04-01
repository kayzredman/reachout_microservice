import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { Payment } from './payment.entity.js';
import { PaymentProvider } from './providers/payment-provider.interface.js';
import { FlutterwaveProvider } from './providers/flutterwave.provider.js';

/** Pricing per tier, keyed by currency. */
const TIER_PRICING: Record<string, Record<string, { amount: number; currency: string }>> = {
  creator: {
    USD: { amount: 9.99, currency: 'USD' },
    GHS: { amount: 120, currency: 'GHS' },
    NGN: { amount: 8000, currency: 'NGN' },
    KES: { amount: 1300, currency: 'KES' },
  },
  ministry_pro: {
    USD: { amount: 29.99, currency: 'USD' },
    GHS: { amount: 350, currency: 'GHS' },
    NGN: { amount: 24000, currency: 'NGN' },
    KES: { amount: 3900, currency: 'KES' },
  },
};

function getTierPrice(tier: string, currency = 'USD') {
  const tierPricing = TIER_PRICING[tier];
  if (!tierPricing) return null;
  return tierPricing[currency] || tierPricing['USD'];
}

@Injectable()
export class PaymentService implements OnModuleInit {
  private readonly logger = new Logger('PaymentService');
  private providers = new Map<string, PaymentProvider>();
  private defaultProvider: string;
  private billingUrl: string;

  constructor(
    private config: ConfigService,
    @InjectRepository(Payment)
    private paymentRepo: Repository<Payment>,
  ) {
    this.defaultProvider =
      this.config.get<string>('PAYMENT_PROVIDER') || 'flutterwave';
    this.billingUrl =
      this.config.get<string>('BILLING_SERVICE_URL') || 'http://localhost:3008';
  }

  onModuleInit() {
    // Register Flutterwave if keys are present
    const flwSecret = this.config.get<string>('FLW_SECRET_KEY');
    const flwHash = this.config.get<string>('FLW_WEBHOOK_HASH');
    if (flwSecret) {
      this.providers.set(
        'flutterwave',
        new FlutterwaveProvider(flwSecret, flwHash || ''),
      );
      this.logger.log('Flutterwave payment provider registered');
    }

    // Future: register Stripe, Paystack, etc.
    // const stripeKey = this.config.get<string>('STRIPE_SECRET_KEY');
    // if (stripeKey) {
    //   this.providers.set('stripe', new StripeProvider(stripeKey));
    // }

    if (this.providers.size === 0) {
      this.logger.warn(
        'No payment providers configured — payment endpoints will fail',
      );
    }
  }

  getProvider(name?: string): PaymentProvider {
    const providerName = name || this.defaultProvider;
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`Payment provider "${providerName}" is not configured`);
    }
    return provider;
  }

  /** Initialize a payment for a tier upgrade */
  async initializePayment(params: {
    orgId: string;
    tier: string;
    email: string;
    customerName?: string;
    currency?: string;
    redirectUrl: string;
    provider?: string;
  }) {
    const pricing = getTierPrice(params.tier, params.currency);
    if (!pricing) {
      throw new Error(`No pricing defined for tier "${params.tier}"`);
    }

    const provider = this.getProvider(params.provider);
    const txRef = `FR-${params.orgId.slice(0, 8)}-${randomUUID().slice(0, 8)}`;

    // Create pending payment record
    const payment = this.paymentRepo.create({
      orgId: params.orgId,
      txRef,
      provider: provider.name,
      amount: pricing.amount,
      currency: pricing.currency,
      status: 'pending',
      tier: params.tier,
      customerEmail: params.email,
    });
    await this.paymentRepo.save(payment);

    // Initialize with the provider
    const result = await provider.initializePayment({
      txRef,
      amount: pricing.amount,
      currency: pricing.currency,
      email: params.email,
      orgId: params.orgId,
      tier: params.tier,
      customerName: params.customerName,
      redirectUrl: params.redirectUrl,
    });

    return {
      paymentLink: result.paymentLink,
      txRef,
      amount: pricing.amount,
      currency: pricing.currency,
    };
  }

  /** Handle a successful payment — verify then upgrade via billing service */
  async handlePaymentSuccess(providerName: string, transactionId: string) {
    const provider = this.getProvider(providerName);
    const verification = await provider.verifyPayment(transactionId);

    if (!verification.success) {
      this.logger.warn(`Payment verification failed for tx ${transactionId}`);
      return { success: false, message: 'Payment verification failed' };
    }

    // Find and update the payment record
    const payment = await this.paymentRepo.findOne({
      where: { txRef: verification.txRef },
    });
    if (!payment) {
      this.logger.warn(`No payment record for txRef ${verification.txRef}`);
      return { success: false, message: 'Payment record not found' };
    }

    // Prevent double-processing
    if (payment.status === 'successful') {
      return { success: true, message: 'Already processed' };
    }

    // Verify amount matches expected
    const pricing = getTierPrice(payment.tier, payment.currency);
    if (pricing && verification.amount < pricing.amount) {
      this.logger.warn(
        `Amount mismatch: expected ${pricing.amount} ${pricing.currency}, got ${verification.amount} ${verification.currency}`,
      );
      payment.status = 'failed';
      payment.meta = { reason: 'amount_mismatch', ...payment.meta };
      await this.paymentRepo.save(payment);
      return { success: false, message: 'Amount mismatch' };
    }

    // Mark payment as successful
    payment.status = 'successful';
    payment.providerRef = verification.providerRef;
    await this.paymentRepo.save(payment);

    // Call billing service to upgrade the subscription
    await this.upgradeBillingTier(payment.orgId, payment.tier);

    this.logger.log(
      `Payment successful: org=${payment.orgId} tier=${payment.tier} via ${providerName}`,
    );

    return { success: true, tier: payment.tier, orgId: payment.orgId };
  }

  /** Call billing service over HTTP to upgrade an org's tier */
  private async upgradeBillingTier(orgId: string, tier: string) {
    try {
      const res = await fetch(`${this.billingUrl}/billing/${orgId}/tier`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier }),
      });

      if (!res.ok) {
        const text = await res.text();
        this.logger.error(
          `Billing service tier upgrade failed: ${res.status} ${text}`,
        );
        throw new Error('Billing service returned an error');
      }

      this.logger.log(`Billing tier upgraded: org=${orgId} → ${tier}`);
    } catch (err) {
      // Log but don't fail the webhook — the payment is already recorded.
      // A retry mechanism or admin reconciliation can fix this.
      this.logger.error(
        `Failed to call billing service for org=${orgId}: ${err}`,
      );
    }
  }

  /** Validate a webhook signature */
  validateWebhook(
    providerName: string,
    headers: Record<string, string>,
    body: unknown,
  ): boolean {
    const provider = this.getProvider(providerName);
    return provider.validateWebhookSignature(headers, body);
  }

  /** Get payment history for an org */
  async getPaymentHistory(orgId: string) {
    return this.paymentRepo.find({
      where: { orgId },
      order: { createdAt: 'DESC' },
      take: 20,
    });
  }

  /** Check payment status by txRef — also calls Flutterwave verify if pending */
  async verifyByTxRef(txRef: string) {
    const payment = await this.paymentRepo.findOne({ where: { txRef } });
    if (!payment) return { success: false, message: 'Not found' };
    if (payment.status === 'successful') {
      return {
        success: true,
        tier: payment.tier,
        orgId: payment.orgId,
        alreadyProcessed: true,
      };
    }

    // If still pending, check Flutterwave directly
    if (payment.status === 'pending') {
      try {
        const provider = this.getProvider(payment.provider) as FlutterwaveProvider;
        const verification = await provider.verifyByReference(txRef);

        if (verification.success) {
          // Verify amount
          const pricing = getTierPrice(payment.tier, payment.currency);
          if (pricing && verification.amount < pricing.amount) {
            payment.status = 'failed';
            payment.meta = { ...payment.meta, reason: 'amount_mismatch' };
            await this.paymentRepo.save(payment);
            return { success: false, status: 'failed', message: 'Amount mismatch' };
          }

          payment.status = 'successful';
          payment.providerRef = verification.providerRef;
          await this.paymentRepo.save(payment);
          await this.upgradeBillingTier(payment.orgId, payment.tier);

          this.logger.log(`Payment verified via polling: org=${payment.orgId} tier=${payment.tier}`);
          return { success: true, tier: payment.tier, orgId: payment.orgId };
        }
      } catch (err) {
        this.logger.warn(`Flutterwave verify-by-ref failed for ${txRef}: ${err}`);
      }
    }

    return { success: false, status: payment.status, tier: payment.tier };
  }

  /** Direct Mobile Money charge — creates record + sends STK push */
  async chargeMobileMoney(params: {
    orgId: string;
    tier: string;
    email: string;
    phoneNumber: string;
    network: string;
    currency?: string;
    redirectUrl: string;
    provider?: string;
  }) {
    const currency = params.currency || 'GHS';
    const pricing = getTierPrice(params.tier, currency);
    if (!pricing) {
      throw new Error(`No pricing for tier "${params.tier}" in ${currency}`);
    }

    const provider = this.getProvider(params.provider) as FlutterwaveProvider;
    const txRef = `FR-${params.orgId.slice(0, 8)}-${randomUUID().slice(0, 8)}`;

    // Create pending payment record
    const payment = this.paymentRepo.create({
      orgId: params.orgId,
      txRef,
      provider: provider.name,
      amount: pricing.amount,
      currency: pricing.currency,
      status: 'pending',
      tier: params.tier,
      customerEmail: params.email,
      paymentMethod: 'mobile_money',
    });
    await this.paymentRepo.save(payment);

    const result = await provider.chargeMobileMoney({
      txRef,
      amount: pricing.amount,
      currency: pricing.currency,
      email: params.email,
      phoneNumber: params.phoneNumber,
      network: params.network,
      orgId: params.orgId,
      tier: params.tier,
      redirectUrl: params.redirectUrl,
    });

    // Store flw_ref for OTP validation later
    if (result.flwRef) {
      payment.meta = { ...payment.meta, flwRef: result.flwRef };
      await this.paymentRepo.save(payment);
    }

    return {
      txRef,
      amount: pricing.amount,
      currency: pricing.currency,
      status: result.status,
      message: result.message,
      redirect: result.redirect,
      flwRef: result.flwRef,
      authMode: result.authMode,
    };
  }

  /** Validate MoMo OTP — called from our in-app OTP input */
  async validateMomoOtp(params: { txRef: string; otp: string }) {
    const payment = await this.paymentRepo.findOne({
      where: { txRef: params.txRef },
    });
    if (!payment) {
      throw new Error('Payment record not found');
    }

    const flwRef = (payment.meta as Record<string, unknown>)?.flwRef as string;
    if (!flwRef) {
      throw new Error('No flw_ref found — cannot validate OTP');
    }

    const provider = this.getProvider(payment.provider) as FlutterwaveProvider;
    const result = await provider.validateCharge(flwRef, params.otp);

    if (result.status === 'successful') {
      // Mark as successful and upgrade tier
      payment.status = 'successful';
      payment.providerRef = String(result.transactionId || '');
      await this.paymentRepo.save(payment);
      await this.upgradeBillingTier(payment.orgId, payment.tier);

      this.logger.log(
        `MoMo OTP validated: org=${payment.orgId} tier=${payment.tier}`,
      );

      return { success: true, tier: payment.tier, orgId: payment.orgId };
    }

    return {
      success: false,
      message: result.message || 'OTP validation failed',
      status: result.status,
    };
  }

  /** Return pricing for all tiers in a given currency */
  getPricing(currency = 'USD') {
    const result: Record<string, { amount: number; currency: string }> = {};
    for (const tier of Object.keys(TIER_PRICING)) {
      const p = getTierPrice(tier, currency);
      if (p) result[tier] = p;
    }
    return result;
  }
}
