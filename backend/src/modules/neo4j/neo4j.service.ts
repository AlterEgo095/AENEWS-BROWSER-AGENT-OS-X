import { Injectable, Inject, OnModuleDestroy, Logger } from '@nestjs/common';

@Injectable()
export class Neo4jService implements OnModuleDestroy {
  private readonly logger = new Logger(Neo4jService.name);

  constructor(@Inject('NEO4J_DRIVER') private readonly driver: any) {}

  getSession(): any {
    return this.driver.session();
  }

  async run(query: string, params?: Record<string, any>): Promise<any[]> {
    const session = this.driver.session();
    try {
      const result = await session.run(query, params);
      return result.records.map((record) => {
        const obj: Record<string, any> = {};
        record.keys.forEach((key) => {
          obj[String(key)] = record.get(key);
        });
        return obj;
      });
    } catch (error: any) {
      this.logger.error(`Neo4j query error: ${error?.message}`, error?.stack);
      throw error;
    } finally {
      await session.close();
    }
  }

  async runTransactional(
    queries: Array<{ query: string; params?: Record<string, any> }>,
  ): Promise<any[][]> {
    const session = this.driver.session();
    try {
      const tx = session.beginTransaction();
      const results: any[][] = [];

      for (const { query, params } of queries) {
        const result = await tx.run(query, params);
        results.push(
          result.records.map((record) => {
            const obj: Record<string, any> = {};
            record.keys.forEach((key) => {
              obj[key as string] = record.get(key);
            });
            return obj;
          }),
        );
      }

      await tx.commit();
      return results;
    } catch (error: any) {
      this.logger.error(`Neo4j transaction error: ${error?.message}`);
      throw error;
    } finally {
      await session.close();
    }
  }

  async onModuleDestroy() {
    await this.driver.close();
    this.logger.log('Neo4j driver closed');
  }
}
