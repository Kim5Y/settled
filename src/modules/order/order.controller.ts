import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
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
  @UseGuards(ApiKeyGuard)
  @HttpCode(HttpStatus.CREATED)
  createOrder(@Body() body: CreateOrderDto) {
    return this.orderservice.createOrder(body);
  }
  @Version('1')
  @Get()
  @UseGuards(ApiKeyGuard)
  @HttpCode(HttpStatus.OK)
  getOrders(@Query('external_customer_id') externalCustormerId: string) {
    return this.orderservice.getlist(externalCustormerId);
  }

  @Version('1')
  @HttpCode(HttpStatus.OK)
  @Get('public/:token')
  getByToken(@Param('token') token: string) {
    return this.orderservice.findByPublicToken(token);
  }
}
