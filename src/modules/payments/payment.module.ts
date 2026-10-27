import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payment.service';
import { PaystackProvider } from './paystack/paystack.provider';
 
@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, PaystackProvider],
  exports: [PaymentsService],
})
export class PaymentsModule {}
 