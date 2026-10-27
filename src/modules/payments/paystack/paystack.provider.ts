import {
  BadGatewayException,
  Body,
  Inject,
  Injectable,
  NotImplementedException,
} from '@nestjs/common';
import {
  CreatePaymentInput,
  CreatePaymentResult,
  ParsedWebhook,
  PaymentProvider,
  VerifiedPayment,
} from '../payments.interface';
import { ConfigService } from '@nestjs/config';

const PAYSTACK_BASE_URL = 'https://api.paystack.co';

interface PaystackInitializeResponse {
  status: boolean;
  message: string;
  data?: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

@Injectable()
export class PaystackProvider implements PaymentProvider {
  readonly name = 'paystack' as const;
  constructor(@Inject(ConfigService) private readonly config: ConfigService) {}

  private get secretKey(): string {
    return this.config.getOrThrow<string>('PAYSTACK_SECRET_KEY');
  }

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    const res = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: input.customerEmail,
        amount: String(input.amountMinor),
        currency: input.currency,
        reference: input.reference,
        callback_url: input.callbackUrl,
        metadata: input.metadata,
      }),
      signal: AbortSignal.timeout(15_000),
    });

    const body = (await res
      .json()
      .catch(() => null)) as PaystackInitializeResponse | null;
    if (!res.ok || !body?.status || !body.data) {
      throw new BadGatewayException(
        `Paystack could not start the payment: ${body?.message ?? res.statusText}`,
      );
    }

    return { checkoutUrl: body.data.authorization_url };
  }

  fetchPayment(_providerReference: string): Promise<VerifiedPayment> {
    throw new NotImplementedException('fetchPayment is built in a later step');
  }

  verifyWebhookSignature(): boolean {
    throw new NotImplementedException(
      'verifyWebhookSignature is built in a later step',
    );
  }

  parseWebhook(_rawBody: Buffer): ParsedWebhook {
    throw new NotImplementedException('parseWebhook is built in a later step');
  }
}
