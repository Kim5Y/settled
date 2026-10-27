import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOrderDto } from './order.dto';
import { randomBytes } from 'crypto';


@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);
  constructor(private readonly prisma: PrismaService) {}
  async createOrder(body: CreateOrderDto) {
    const order = await this.prisma.client.orm.public.Orders.create({
      reference: this.generateReference(),
      customerEmail: body.customer_email,
      externalCustomerId: body.external_customer_id,
      publicToken: this.generatePublicToken(),
      description: body.description,
      amountMinor: BigInt(body.amount),
      currency: body.currency,
    });
this.logger.log(order)
    return {
      ...order,
      amountMinor: order.amountMinor.toString(),
    };
  }

  private generateReference(): string {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const suffix = randomBytes(4).toString('hex').toUpperCase();
    return `ORD-${date}-${suffix}`;
  }

  private generatePublicToken(): string {
    return randomBytes(24).toString('base64url');
  }
}
