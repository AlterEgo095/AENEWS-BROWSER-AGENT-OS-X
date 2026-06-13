import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { MinioService } from './minio.service';

@Global()
@Module({
  providers: [
    {
      provide: 'MINIO_CLIENT',
      useFactory: (configService: ConfigService) => {
        return new Minio.Client({
          endPoint: configService.get<string>('minio.endpoint'),
          port: configService.get<number>('minio.port'),
          accessKey: configService.get<string>('minio.accessKey'),
          secretKey: configService.get<string>('minio.secretKey'),
          useSSL: false,
        });
      },
      inject: [ConfigService],
    },
    MinioService,
  ],
  exports: ['MINIO_CLIENT', MinioService],
})
export class MinioModule {}
