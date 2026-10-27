import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOrderDto } from './order.dto';
import { randomBytes } from 'crypto';

interface OrderRow {
  id: string;
  reference: string;
  publicToken: string;
  status: string;
  amountMinor: bigint;
  currency: string;
  customerEmail: string;
  externalCustomerId: string | null;
  description: string | null;
  metadata: unknown;
  paidAt: string | null;
  createdAt: string;
}

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
    this.logger.log(order);
    return {
      ...order,
      amountMinor: order.amountMinor.toString(),
    };
  }

  async getlist(externalCustormerId: string) {
    const rows = await this.prisma.client.orm.public.Orders.where({
      externalCustomerId: externalCustormerId,
    })
      .orderBy((o) => o.createdAt.desc())
      .limit(50)
      .all();
    return rows.map((row) => this.toResponse(row));
  }

  async findByPublicToken(token: string) {
    // if (!/^[a-f0-9]{48}$/.test(token)) {
    //   throw new NotFoundException('Order not found');
    // }
    const order = await this.prisma.client.orm.public.Orders.where({
      publicToken: token,
    }).first();
    if (!order) throw new NotFoundException('Order not found');
    return this.toPublicResponse(order);
  }




  private generateReference(): string {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const suffix = randomBytes(4).toString('hex').toUpperCase();
    return `ORD-${date}-${suffix}`;
  }

  private generatePublicToken(): string {
    return randomBytes(24).toString('base64url');
  }

  private toResponse(order: OrderRow) {
    return {
      id: order.id,
      reference: order.reference,
      public_token: order.publicToken,
      status: order.status,
      amount: Number(order.amountMinor),
      currency: order.currency,
      customer_email: order.customerEmail,
      external_customer_id: order.externalCustomerId,
      description: order.description,
      metadata: order.metadata,
      paid_at: order.paidAt,
      created_at: order.createdAt,
    };
  }
  private toPublicResponse(order: OrderRow) {
    return {
      reference: order.reference,
      status: order.status,
      amount: Number(order.amountMinor),
      currency: order.currency,
      description: order.description,
      paid_at: order.paidAt,
      created_at: order.createdAt,
    };
  }
}
