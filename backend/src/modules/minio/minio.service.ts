import { Injectable, Inject, OnModuleInit, Logger } from '@nestjs/common';
import * as Minio from 'minio';
import { ConfigService } from '@nestjs/config';
import { Readable } from 'stream';

@Injectable()
export class MinioService implements OnModuleInit {
  private readonly logger = new Logger(MinioService.name);
  private readonly bucket: string;

  constructor(
    @Inject('MINIO_CLIENT') private readonly minioClient: Minio.Client,
    private readonly configService: ConfigService,
  ) {
    this.bucket =
      this.configService.get<string>('minio.bucket') || 'aenews-storage';
  }

  async onModuleInit() {
    const buckets = [
      'aenews-storage',
      'agent-artifacts',
      'agent-logs',
      'agent-models',
      'tenant-uploads',
      'task-results',
    ];
    for (const bucket of buckets) {
      try {
        const exists = await this.minioClient.bucketExists(bucket);
        if (!exists) {
          await this.minioClient.makeBucket(bucket);
          this.logger.log(`Created MinIO bucket: ${bucket}`);
        }
      } catch (error: any) {
        this.logger.warn(`Could not initialize bucket ${bucket}: ${error?.message}`);
      }
    }
  }

  async upload(
    bucket: string,
    objectName: string,
    data: Buffer | Readable,
    metadata?: Record<string, string>,
  ): Promise<string> {
    const size = data instanceof Buffer ? data.length : undefined;
    await this.minioClient.putObject(bucket, objectName, data, size, metadata);
    return objectName;
  }

  async download(bucket: string, objectName: string): Promise<Readable> {
    return this.minioClient.getObject(bucket, objectName);
  }

  async delete(bucket: string, objectName: string): Promise<void> {
    await this.minioClient.removeObject(bucket, objectName);
  }

  async getPresignedUrl(
    bucket: string,
    objectName: string,
    expirySeconds: number = 3600,
  ): Promise<string> {
    return this.minioClient.presignedGetObject(
      bucket,
      objectName,
      expirySeconds,
    );
  }

  async getPresignedPutUrl(
    bucket: string,
    objectName: string,
    expirySeconds: number = 3600,
  ): Promise<string> {
    return this.minioClient.presignedPutObject(
      bucket,
      objectName,
      expirySeconds,
    );
  }

  async listObjects(bucket: string, prefix?: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const objects: any[] = [];
      const stream = this.minioClient.listObjects(bucket, prefix, true);
      stream.on('data', (obj) => objects.push(obj));
      stream.on('end', () => resolve(objects));
      stream.on('error', reject);
    });
  }

  async bucketExists(bucket: string): Promise<boolean> {
    return this.minioClient.bucketExists(bucket);
  }
}
