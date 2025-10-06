import 'module-alias/register';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';
import { LogInterceptor } from './interceptors/log.interceptor';
import { json } from 'express';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: '*' });
  app.use(json({ limit: '25mb' }));
  app.useGlobalInterceptors(new LogInterceptor());

  const configService = app.get(ConfigService);

  const kafkaBrokers = configService.get('KAFKA_BROKERS');
  logger.log(`🔍 DEBUG - KAFKA_BROKERS: ${kafkaBrokers}`);
  logger.log(`🔍 DEBUG - Type: ${typeof kafkaBrokers}`);
  
  if (kafkaBrokers) {
    logger.log(`🔌 Conectando ao Kafka: ${kafkaBrokers}`);

    app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.KAFKA,
      options: {
        client: {
          clientId: configService.get('KAFKA_CLIENT_ID', 'printers-api'),
          brokers: kafkaBrokers.split(','),
        },
        consumer: {
          groupId: configService.get(
            'KAFKA_GROUP_ID',
            'printers-consumer-group',
          ),
        },
      },
    });

    await app.startAllMicroservices();
    logger.log('✅ Kafka consumer iniciado');
  } else {
    logger.warn('⚠️  KAFKA_BROKERS não configurado - consumer desabilitado');
  }

  const port = configService.get('PORT', 3000);
  await app.listen(port);
  logger.log(`🚀 API rodando em http://localhost:${port}`);
}

bootstrap();
