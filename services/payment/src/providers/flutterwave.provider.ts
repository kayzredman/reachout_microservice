import { Logger } from '@nestjs/common';
import {
  PaymentProvider,
  InitializePaymentParams,
  InitializePaymentResult,
  VerifyPaymentResult,
} from './payment-provider.interface.js';

/** Flutterwave API response shapes */
interface FlwInitResponse {
  status: string;
  message: string;
  data: { link: string };
}

interface FlwVerifyResponse {
  status: string;
  data: {
    id: number;
    tx_ref: string;
    amount: number;
    currency: string;
    status: string;
    customer?: { email?: string };
    meta?: Record<string, string>;
  };
}

interface FlwChargeResponse {
  status: string;
  message: string;
  meta?: { authorization?: { mode?: string; redirect?: string; validate_instructions?: unknown } };
  data?: { id?: number; tx_ref?: string; flw_ref?: string; status?: string; processor_response?: string };
}

/**
 * Flutterwave payment provider implementation.
 * Supports Card, Mobile Money, USSD, Bank Transfer across Africa.
 */
export class FlutterwaveProvider implements PaymentProvider {
  readonly name = 'flutterwave';
  private readonly logger = new Logger('FlutterwaveProvider');
  private readonly secretKey: string;
  private readonly webhookHash: string;
  private readonly baseUrl = 'https://api.flutterwave.com/v3';

  constructor(secretKey: string, webhookHash: string) {
    this.secretKey = secretKey;
    this.webhookHash = webhookHash;
  }

  async initializePayment(
    params: InitializePaymentParams,
  ): Promise<InitializePaymentResult> {
    const payload = {
      tx_ref: params.txRef,
      amount: params.amount,
      currency: params.currency,
      redirect_url: params.redirectUrl,
      customer: {
        email: params.email,
        name: params.customerName || params.email,
      },
      customizations: {
        title: 'FaithReach Subscription',
        description: `Upgrade to ${params.tier} plan`,
        logo: 'https://faithreach.app/logo.png',
      },
      meta: {
        orgId: params.orgId,
        tier: params.tier,
        ...params.meta,
      },
    };

    const res = await fetch(`${this.baseUrl}/payments`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data: FlwInitResponse = await res.json();

    if (data.status !== 'success') {
      this.logger.error(`Flutterwave init failed: ${JSON.stringify(data)}`);
      throw new Error(data.message || 'Payment initialization failed');
    }

    return {
      paymentLink: data.data.link,
      providerRef: params.txRef,
      raw: data,
    };
  }

  async verifyPayment(transactionId: string): Promise<VerifyPaymentResult> {
    const res = await fetch(
      `${this.baseUrl}/transactions/${transactionId}/verify`,
      {
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
        },
      },
    );

    const data: FlwVerifyResponse = await res.json();

    if (data.status !== 'success') {
      this.logger.error(`Flutterwave verify failed: ${JSON.stringify(data)}`);
      return {
        success: false,
        txRef: '',
        amount: 0,
        currency: '',
        providerRef: transactionId,
      };
    }

    const tx = data.data;
    return {
      success: tx.status === 'successful',
      txRef: tx.tx_ref,
      amount: tx.amount,
      currency: tx.currency,
      providerRef: String(tx.id),
      customerEmail: tx.customer?.email,
      meta: tx.meta,
    };
  }

  /**
   * Verify a transaction by tx_ref (not transaction ID).
   * Uses Flutterwave's verify-by-reference endpoint.
   */
  async verifyByReference(txRef: string): Promise<VerifyPaymentResult> {
    const res = await fetch(
      `${this.baseUrl}/transactions/verify_by_reference?tx_ref=${encodeURIComponent(txRef)}`,
      {
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
        },
      },
    );

    const data: FlwVerifyResponse = await res.json();

    this.logger.log(`verify-by-reference for ${txRef}: status=${data.status}, txStatus=${data.data?.status}`);

    if (data.status !== 'success') {
      return {
        success: false,
        txRef,
        amount: 0,
        currency: '',
        providerRef: '',
      };
    }

    const tx = data.data;
    return {
      success: tx.status === 'successful',
      txRef: tx.tx_ref,
      amount: tx.amount,
      currency: tx.currency,
      providerRef: String(tx.id),
      customerEmail: tx.customer?.email,
      meta: tx.meta,
    };
  }

  validateWebhookSignature(headers: Record<string, string>): boolean {
    const signature = headers['verif-hash'];
    if (!signature) return false;
    return signature === this.webhookHash;
  }

  /**
   * Direct Mobile Money charge via Flutterwave.
   * Sends an STK push / USSD prompt to the user's phone.
   */
  async chargeMobileMoney(params: {
    txRef: string;
    amount: number;
    currency: string;
    email: string;
    phoneNumber: string;
    network: string;
    orgId: string;
    tier: string;
    redirectUrl: string;
  }): Promise<{ status: string; message: string; redirect?: string; authMode?: string; transactionId?: number; flwRef?: string }> {
    const payload = {
      tx_ref: params.txRef,
      amount: params.amount,
      currency: params.currency,
      email: params.email,
      phone_number: params.phoneNumber,
      network: params.network.toUpperCase(),
      redirect_url: params.redirectUrl,
      meta: {
        orgId: params.orgId,
        tier: params.tier,
      },
    };

    // Determine charge type based on currency
    let chargeType = 'mobile_money_ghana';
    if (params.currency === 'NGN') chargeType = 'mobile_money_nigeria';
    else if (params.currency === 'KES') chargeType = 'mpesa';
    else if (params.currency === 'UGX') chargeType = 'mobile_money_uganda';
    else if (params.currency === 'TZS') chargeType = 'mobile_money_tanzania';
    else if (params.currency === 'RWF') chargeType = 'mobile_money_rwanda';
    else if (params.currency === 'ZAR') chargeType = 'mobile_money_south_africa';
    else if (params.currency === 'XAF' || params.currency === 'XOF') chargeType = 'mobile_money_franco';

    const res = await fetch(`${this.baseUrl}/charges?type=${chargeType}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data: FlwChargeResponse = await res.json();

    this.logger.log(`MoMo charge full response: ${JSON.stringify(data)}`);

    if (data.status !== 'success' && data.status !== 'pending') {
      this.logger.error(`MoMo charge failed: ${JSON.stringify(data)}`);
      throw new Error(data.message || 'Mobile Money charge failed');
    }

    return {
      status: data.status,
      message: data.message,
      redirect: data.meta?.authorization?.redirect,
      authMode: data.meta?.authorization?.mode,
      transactionId: data.data?.id,
      flwRef: data.data?.flw_ref,
    };
  }

  /**
   * Validate a charge with OTP (used for MoMo after initial charge).
   * Calls Flutterwave's /v3/validate-charge endpoint.
   */
  async validateCharge(flwRef: string, otp: string): Promise<{ status: string; message: string; transactionId?: number }> {
    const res = await fetch(`${this.baseUrl}/validate-charge`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ otp, flw_ref: flwRef }),
    });

    const data = await res.json() as { status: string; message: string; data?: { id?: number; status?: string; tx_ref?: string } };

    this.logger.log(`validate-charge response: ${JSON.stringify(data)}`);

    if (data.status !== 'success') {
      this.logger.error(`Validate charge failed: ${JSON.stringify(data)}`);
      throw new Error(data.message || 'OTP validation failed');
    }

    return {
      status: data.data?.status || data.status,
      message: data.message,
      transactionId: data.data?.id,
    };
  }
}
