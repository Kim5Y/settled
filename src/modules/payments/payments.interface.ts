export type ProviderName = 'stripe' | 'paystack' | 'flutterwave';

export type NormalizedPaymentStatus =
  'pending' | 'succeeded' | 'failed' | 'abandoned';

export interface CreatePaymentInput {
  reference: string;
  amountMinor: number;
  currency: string;
  customerEmail: string;
  callbackUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface CreatePaymentResult {
  checkoutUrl: string;
  providerTransactionId?: string;
}

export interface VerifiedPayment {
  providerReference: string;
  providerTransactionId: string | null;
  status: NormalizedPaymentStatus;
  amountReceivedMinor: number;
  currency: string;
  channel?: string;
  failureReason?: string;
}

export interface ParsedWebhook {
  eventId: string;
  eventType: string;
  providerReference: string | null;
}

export interface PaymentProvider {
  readonly name: ProviderName;

  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;

  fetchPayment(providerReference: string): Promise<VerifiedPayment>;

  verifyWebhookSignature(
    rawBody: Buffer,
    headers: Record<string, string | string[] | undefined>,
  ): boolean;
  parseWebhook(rawBody: Buffer): ParsedWebhook;
}
