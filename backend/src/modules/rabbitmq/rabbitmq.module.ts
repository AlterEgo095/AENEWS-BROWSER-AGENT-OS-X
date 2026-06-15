import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as amqp from 'amqp-connection-manager';
import { RabbitMQService } from './rabbitmq.service';

@Global()
@Module({
  providers: [
    {
      provide: 'RABBITMQ_CONNECTION',
      useFactory: (configService: ConfigService) => {
        const url = configService.get<string>('rabbitmq.url') ?? 'amqp://localhost:5672';
        return amqp.connect([url]);
      },
      inject: [ConfigService],
    },
    RabbitMQService,
  ],
  exports: ['RABBITMQ_CONNECTION', RabbitMQService],
})
export class RabbitMQModule {}
