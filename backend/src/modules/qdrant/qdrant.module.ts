import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QdrantClient } from '@qdrant/js-client-rest';
import { QdrantService } from './qdrant.service';

@Global()
@Module({
  providers: [
    {
      provide: 'QDRANT_CLIENT',
      useFactory: (configService: ConfigService) => {
        return new QdrantClient({
          host: configService.get<string>('qdrant.host'),
          port: configService.get<number>('qdrant.port'),
          apiKey: configService.get<string>('qdrant.apiKey') || undefined,
        });
      },
      inject: [ConfigService],
    },
    QdrantService,
  ],
  exports: ['QDRANT_CLIENT', QdrantService],
})
export class QdrantModule {}
