import { Injectable, Inject, OnModuleDestroy, Logger } from '@nestjs/common';

@Injectable()
export class RabbitMQService implements OnModuleDestroy {
  private readonly logger = new Logger(RabbitMQService.name);

  constructor(
    @Inject('RABBITMQ_CONNECTION')
    private readonly connection: any,
  ) {}

  async publish(
    exchange: string,
    routingKey: string,
    message: any,
  ): Promise<void> {
    const channelWrapper = this.connection.createChannel({
      json: true,
    });

    await channelWrapper.addSetup(async (channel: any) => {
      await channel.assertExchange(exchange, 'topic', { durable: true });
      await channel.publish(
        exchange,
        routingKey,
        Buffer.from(JSON.stringify(message)),
        {
          persistent: true,
          contentType: 'application/json',
        },
      );
    });

    await channelWrapper.close();
  }

  async subscribe(
    queue: string,
    exchange: string,
    routingKey: string,
    callback: (message: any) => Promise<void>,
  ): Promise<void> {
    const channelWrapper = this.connection.createChannel({
      json: true,
    });

    await channelWrapper.addSetup(async (channel: any) => {
      await channel.assertExchange(exchange, 'topic', { durable: true });
      await channel.assertQueue(queue, { durable: true });
      await channel.bindQueue(queue, exchange, routingKey);

      await channel.consume(queue, async (msg: any) => {
        if (msg) {
          try {
            const content = JSON.parse(msg.content.toString());
            await callback(content);
            channel.ack(msg);
          } catch (error: any) {
            this.logger.error(`Error processing message: ${error?.message}`);
            channel.nack(msg, false, true);
          }
        }
      });
    });
  }

  async assertQueue(queue: string, options?: any): Promise<void> {
    const channelWrapper = this.connection.createChannel();
    await channelWrapper.addSetup(async (channel: any) => {
      await channel.assertQueue(queue, { durable: true, ...options });
    });
    await channelWrapper.close();
  }

  async onModuleDestroy() {
    await this.connection.close();
    this.logger.log('RabbitMQ connection closed');
  }
}
