import { Module, Global, Logger, OnModuleInit } from '@nestjs/common';
import { Redis } from 'ioredis';

export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: () => {
        const redis = new Redis({
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
          password: process.env.REDIS_PASSWORD,
          db: parseInt(process.env.REDIS_DB || '0'),
          retryStrategy: (times) => {
            const delay = Math.min(times * 50, 2000);
            Logger.log(
              `Redis reconnecting... attempt ${times}, delay ${delay}ms`,
              'RedisModule',
            );
            return delay;
          },
          maxRetriesPerRequest: 3,
        });

        redis.on('connect', () => {
          Logger.log('Redis connected successfully', 'RedisModule');
        });

        redis.on('error', (err) => {
          Logger.error(`Redis connection error: ${err.message}`, 'RedisModule');
        });

        redis.on('ready', () => {
          Logger.log('Redis ready to accept commands', 'RedisModule');
        });

        return redis;
      },
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule implements OnModuleInit {
  constructor() {}

  async onModuleInit() {
    Logger.log(
      `Redis Module initialized - connecting to ${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || '6379'}`,
      'RedisModule',
    );
  }
}
