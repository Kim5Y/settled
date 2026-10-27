import { IsIn, IsOptional, IsUrl } from 'class-validator';
import type { ProviderName } from './payments.interface';

export class CreatePaymentDto {
  @IsIn(['paystack', 'stripe', 'flutterwave'], {
    message: 'provider must be paystack, stripe or flutterwave',
  })
  provider!: ProviderName;


  @IsOptional()
  @IsUrl({ require_tld: false }, { message: 'callback_url must be a valid URL' })
  callback_url?: string;
}