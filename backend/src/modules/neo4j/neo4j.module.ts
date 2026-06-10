import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import neo4j, { Driver } from 'neo4j-driver';
import { Neo4jService } from './neo4j.service';

@Global()
@Module({
  providers: [
    {
      provide: 'NEO4J_DRIVER',
      useFactory: (configService: ConfigService) => {
        return neo4j.driver(
          configService.get<string>('neo4j.uri'),
          neo4j.auth.basic(
            configService.get<string>('neo4j.user'),
            configService.get<string>('neo4j.password'),
          ),
        );
      },
      inject: [ConfigService],
    },
    Neo4jService,
  ],
  exports: ['NEO4J_DRIVER', Neo4jService],
})
export class Neo4jModule {}
