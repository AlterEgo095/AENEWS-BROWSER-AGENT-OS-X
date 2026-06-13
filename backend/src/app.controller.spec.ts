import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [() => ({
            app: { name: 'AENEWS-Agent-OS-X', version: '0.1.0', env: 'test' },
          })],
        }),
      ],
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('system info', () => {
    it('should return system info', () => {
      const result = appController.getInfo();
      expect(result.name).toBe('AENEWS-Agent-OS-X');
      expect(result.status).toBe('operational');
      expect(result.clusters).toBeDefined();
    });
  });

  describe('version', () => {
    it('should return version info', () => {
      const result = appController.getVersion();
      expect(result.version).toBe('0.1.0');
      expect(result.apiVersion).toBe('v1');
    });
  });
});
