import { Provider } from '@nestjs/common';
import Redis from 'ioredis';

import {
  REDIS_PUBLISHER_CLIENT,
  REDIS_SUBSCRIBER_CLIENT,
} from './redis.constants';

export type RedisClient = Redis;

export const redisProvider: Provider = {
  useFactory: (): RedisClient => {
    return new Redis({
      host: 'redis-container',
      port: 6379,
      // db:2
    });
  },
  provide: REDIS_PUBLISHER_CLIENT,
};
