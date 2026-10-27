import { Module } from '@nestjs/common';
import { OrderModule } from './modules/order/order.module';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    OrderModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath:
        process.env.NODE_ENV === 'production'
          ? '.env.production'
          : '.env.local',
    }),
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
