import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('main');
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );
  app.setGlobalPrefix('api', { exclude: ['/'] });
  app.enableVersioning({
    type: VersioningType.URI,
  });
  const PORT = process.env.PORT ?? 3000;
  await app.listen(PORT);
  logger.log('server running on PORT:', PORT);
}
bootstrap();
