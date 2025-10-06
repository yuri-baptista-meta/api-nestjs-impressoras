import 'module-alias/register';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { LogInterceptor } from './interceptors/log.interceptor';
import { json } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: '*' });
  app.use(json({ limit: '25mb' }));
  app.useGlobalInterceptors(new LogInterceptor());
  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
