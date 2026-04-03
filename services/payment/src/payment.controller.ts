import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  Headers,
  HttpCode,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { PaymentService } from './payment.service.js';

@Controller('payment')
export class PaymentController {
  private readonly logger = new Logger('PaymentController');

  constructor(private readonly paymentService: PaymentService) {}

  /**
   * POST /payment/initialize
   * Frontend calls this to get a checkout URL.
   */
  @Post('initialize')
  async initialize(
    @Body()
    body: {
      orgId: string;
      tier: string;
      email: string;
      customerName?: string;
      currency?: string;
      redirectUrl: string;
      provider?: string;
    },
  ) {
    if (!body.orgId || !body.tier || !body.email || !body.redirectUrl) {
      throw new HttpException(
        'orgId, tier, email, and redirectUrl are required',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      return await this.paymentService.initializePayment(body);
    } catch (err) {
      this.logger.error(`Payment init failed: ${err}`);
      throw new HttpException(
        err instanceof Error ? err.message : 'Payment initialization failed',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  /**
   * POST /payment/webhook/flutterwave
   * Flutterwave sends payment events here.
   */
  @Post('webhook/flutterwave')
  @HttpCode(200)
  async flutterwaveWebhook(
    @Headers() headers: Record<string, string>,
    @Body()
    body: { event?: string; data?: { id?: number; tx_ref?: string } },
  ) {
    // Validate webhook signature
    const valid = this.paymentService.validateWebhook(
      'flutterwave',
      headers,
      body,
    );
    if (!valid) {
      this.logger.warn('Invalid Flutterwave webhook signature');
      throw new HttpException('Invalid signature', HttpStatus.UNAUTHORIZED);
    }

    // Process charge events
    if (body.data?.id) {
      if (body.event === 'charge.completed') {
        const result = await this.paymentService.handlePaymentSuccess(
          'flutterwave',
          String(body.data.id),
        );
        return result;
      }

      if (body.event === 'charge.failed') {
        const result = await this.paymentService.handlePaymentFailure(
          'flutterwave',
          String(body.data.id),
          body.data.tx_ref,
        );
        return result;
      }
    }

    return { received: true };
  }

  /**
   * GET /payment/verify/:txRef
   * Frontend calls after redirect to check payment status.
   */
  @Get('verify/:txRef')
  async verify(@Param('txRef') txRef: string) {
    return this.paymentService.verifyByTxRef(txRef);
  }

  /**
   * GET /payment/history/:orgId
   * Get payment history for an organization.
   */
  @Get('history/:orgId')
  async history(@Param('orgId') orgId: string) {
    return this.paymentService.getPaymentHistory(orgId);
  }

  /**
   * POST /payment/charge/momo
   * Direct Mobile Money charge — sends STK push to user's phone.
   */
  @Post('charge/momo')
  async chargeMomo(
    @Body()
    body: {
      orgId: string;
      tier: string;
      email: string;
      phoneNumber: string;
      network: string;
      currency?: string;
      redirectUrl: string;
    },
  ) {
    if (!body.orgId || !body.tier || !body.email || !body.phoneNumber || !body.network || !body.redirectUrl) {
      throw new HttpException(
        'orgId, tier, email, phoneNumber, network, and redirectUrl are required',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      return await this.paymentService.chargeMobileMoney(body);
    } catch (err) {
      this.logger.error(`MoMo charge failed: ${err}`);
      throw new HttpException(
        err instanceof Error ? err.message : 'Mobile Money charge failed',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  /**
   * GET /payment/pricing
   * Return pricing for all tiers in a given currency.
   */
  @Get('pricing')
  getPricing(@Query('currency') currency?: string) {
    return this.paymentService.getPricing(currency || 'USD');
  }

  /**
   * POST /payment/validate-momo
   * Validate MoMo OTP in-app (instead of redirecting to Flutterwave's OTP page).
   */
  @Post('validate-momo')
  async validateMomo(
    @Body() body: { txRef: string; otp: string },
  ) {
    if (!body.txRef || !body.otp) {
      throw new HttpException(
        'txRef and otp are required',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      return await this.paymentService.validateMomoOtp(body);
    } catch (err) {
      this.logger.error(`MoMo OTP validation failed: ${err}`);
      throw new HttpException(
        err instanceof Error ? err.message : 'OTP validation failed',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }
}
