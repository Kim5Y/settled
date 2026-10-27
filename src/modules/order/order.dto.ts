import { Type } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Length,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator';

export class PaymentMetaDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 50)
  @Matches(/^[a-zA-Z0-9\-_]+$/, { message: 'invalid product id' })
  product_id!: string;
}

export class CreateOrderDto {
  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: 'amount must be a valid integer nubmer' },
  )
  @Min(100, { message: 'amount must be at least 100 kobo (1 NGN)' })
  amount!: number;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z]{3}$/, {
    message:
      'currency must be a 3-letter ISO-4217 uppercase string (e.g., NGN)',
  })
  currency!: string;
  @IsEmail({}, { message: 'customer_email must be a valid email address' })
  @IsNotEmpty()
  customer_email!: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 64)
  @Matches(/^[a-zA-Z0-9_\-]+$/, {
    message:
      'external_customer_id must be alphanumeric, underscores, or hyphens',
  })
  external_customer_id!: string;

  @IsString()
  @IsNotEmpty()
  @Length(3, 255)
  description!: string;

  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => PaymentMetaDto)
  metadata?: PaymentMetaDto;
}
