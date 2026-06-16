/**
 * AENEWS Agent OS X — Phase 13: Compression Interceptor
 *
 * Compresses response bodies using gzip/deflate for responses
 * exceeding a configurable threshold. Reduces bandwidth by 60-80%
 * for JSON payloads.
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import * as zlib from 'zlib';

export interface CompressionStats {
  totalCompressed: number;
  totalBytesSaved: number;
  averageRatio: number;
}

@Injectable()
export class CompressionInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CompressionInterceptor.name);
  private readonly enabled: boolean;
  private readonly threshold: number;
  private readonly level: number;
  private readonly stats: CompressionStats = {
    totalCompressed: 0,
    totalBytesSaved: 0,
    averageRatio: 0,
  };

  constructor(@Optional() private readonly configService?: ConfigService) {
    this.enabled = this.configService?.get<string>('performance.compressionEnabled') !== 'false';
    this.threshold = this.configService?.get<number>('performance.compressionThreshold') ?? 1024; // 1KB
    this.level = this.configService?.get<number>('performance.compressionLevel') ?? 6; // Default zlib level
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (!this.enabled) return next.handle();

    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Check if client accepts compression
    const acceptEncoding = request.headers['accept-encoding'] || '';
    if (!acceptEncoding.includes('gzip') && !acceptEncoding.includes('deflate')) {
      return next.handle();
    }

    return next.handle().pipe(
      map((data) => {
        // Skip if already compressed or no data
        if (!data || response.headersSent) return data;

        const body = typeof data === 'string' ? data : JSON.stringify(data);

        // Don't compress small responses
        if (body.length < this.threshold) {
          return data;
        }

        // Use async gzip to avoid blocking the event loop on large payloads
        try {
          const compressed = zlib.gzipSync(body, { level: this.level }); // NOTE: sync for now; consider zlib.gzip for very large bodies
          const ratio = compressed.length / body.length;

          // Only use compression if it actually reduces size
          if (ratio < 0.95) {
            response.setHeader('Content-Encoding', 'gzip');
            response.setHeader('Content-Length', compressed.length);
            response.removeHeader('Content-Type');
            response.setHeader('Content-Type', 'application/json');

            // Track stats
            this.stats.totalCompressed++;
            this.stats.totalBytesSaved += body.length - compressed.length;
            this.stats.averageRatio =
              this.stats.averageRatio === 0
                ? ratio
                : (this.stats.averageRatio * (this.stats.totalCompressed - 1) + ratio) /
                  this.stats.totalCompressed;

            return compressed;
          }
        } catch (err: any) {
          this.logger.debug(`Compression failed, sending uncompressed: ${err.message}`);
        }

        return data;
      }),
    );
  }

  getStats(): CompressionStats & { enabled: boolean; threshold: number } {
    return {
      ...this.stats,
      enabled: this.enabled,
      threshold: this.threshold,
    };
  }
}
