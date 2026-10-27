import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UseGuards,
  Version,
} from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderDto } from './order.dto';
import { ApiKeyGuard } from '../authorization/api-key.guard';

@Controller('order')
export class OrderController {
  constructor(private readonly orderservice: OrderService) {}
  @Version('1')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  createOrder(@Body() body: CreateOrderDto) {
    return this.orderservice.createOrder(body);
  }

  @Get()
  @UseGuards(ApiKeyGuard)
  getOrders(@Query("external_customer_id") externalCustormerId?: string) {

  }
}
