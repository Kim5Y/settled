import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PaymentProvider, ProviderName } from './payments.interface';
import { PrismaService } from 'src/prisma/prisma.service';
import { PaystackProvider } from './paystack/paystack.provider';
import { CreatePaymentDto } from './payment.dto';
import { randomBytes } from 'crypto';

@Injectable()
export class PaymentsService {
  private readonly providers: Map<ProviderName, PaymentProvider>;

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(PaystackProvider) paystack: PaystackProvider,
  ) {
    this.providers = new Map<ProviderName, PaymentProvider>([
      [paystack.name, paystack],
    ]);
  }

  async create(orderId: string, dto: CreatePaymentDto) {
    const provider = this.providers.get(dto.provider);

    if (!provider) {
      throw new BadRequestException(`${dto.provider} is not available yet`);
    }

    //  const order = await orm.Orders.where({ id: orderId }).first();
    const order = await this.prisma.client.orm.public.Orders.where({
      id: orderId,
    }).first();
    if (!order) throw new NotFoundException('Order not found');
    if (order.status !== 'pending') {
      throw new ConflictException(
        `Order is ${order.status}, so it cannot be paid`,
      );
    }

    const providerReference = `${order.reference}-${randomBytes(3).toString('hex')}`;
    const payment = await this.prisma.client.orm.public.Payments.create({
      orderId: order.id,
      provider: dto.provider,
      providerReference,
      amountMinor: order.amountMinor,
      currency: order.currency,
    });

    try {
      const result = await provider.createPayment({
        reference: providerReference,
        amountMinor: Number(order.amountMinor),
        currency: order.currency,
        customerEmail: order.customerEmail,
        callbackUrl: dto.callback_url,
        metadata: { order_reference: order.reference, payment_id: payment.id },
      });

      await this.prisma.client.orm.public.Payments.where({
        id: payment.id,
      }).update({
        status: 'pending',
        checkoutUrl: result.checkoutUrl,
      });

      return {
        payment_id: payment.id,
        order_reference: order.reference,
        provider: dto.provider,
        provider_reference: providerReference,
        status: 'pending',
        amount: Number(order.amountMinor),
        currency: order.currency,
        checkout_url: result.checkoutUrl,
      };
    } catch (err) {
      await this.prisma.client.orm.public.Payments.where({
        id: payment.id,
      }).update({
        status: 'failed',
        failureReason: err instanceof Error ? err.message : 'Unknown error',
      });
      throw err;
    }
  }
}
