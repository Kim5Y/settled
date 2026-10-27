import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
  Version,
} from '@nestjs/common';
import { ApiKeyGuard } from '../authorization/api-key.guard';
import { PaymentsService } from './payment.service';
import { CreatePaymentDto } from './payment.dto';

@Controller('payment')
export class PaymentsController {
  constructor(
    @Inject(PaymentsService) private readonly paymentsService: PaymentsService,
  ) {}

  @Version('1')
  @Post('/:orderId')
  @UseGuards(ApiKeyGuard)
  @HttpCode(HttpStatus.CREATED)
  create(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body() dto: CreatePaymentDto,
  ) {
    return this.paymentsService.create(orderId, dto);
  }
}
