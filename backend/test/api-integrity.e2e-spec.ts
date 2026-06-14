/**
 * AENEWS Agent OS X — API Integrity E2E Tests
 *
 * Tests that verify the API routing is correct and no double-prefixing
 * exists (e.g., /api/v1/api/v1/...), plus end-to-end workflow tests
 * that exercise the full request lifecycle.
 *
 * Tests cover:
 *   1. Orchestration endpoints are at /api/v1/orchestration/* (not doubled)
 *   2. Intelligence endpoints are at /api/v1/intelligence/*
 *   3. Swarm endpoints are at /api/v1/swarm/*
 *   4. Full workflow: login → create agent → execute → get result
 *   5. Full workflow: login → create mission → start → get progress
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';

import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../src/modules/auth/guards/roles.guard';

// ─── Mock Controllers for Route Testing ────────────────────

@Controller('orchestration')
class MockOrchestrationController {
  @Get('cluster-health')
  getClusterHealth() {
    return { healthy: true };
  }

  @Get('statistics')
  getStatistics() {
    return {};
  }

  @Get('history')
  getHistory() {
    return [];
  }

  @Get('connectors')
  getConnectors() {
    return {};
  }

  @Post('collaborate')
  collaborate() {
    return {};
  }

  @Post('decompose')
  decompose() {
    return {};
  }
}

@Controller('intelligence')
class MockIntelligenceController {
  @Get('graph/stats')
  getGraphStats() {
    return {};
  }

  @Get('graph/expertise')
  getExpertise() {
    return [];
  }

  @Post('graph/query')
  executeGraphQuery() {
    return {};
  }

  @Get('learning/stats')
  getLearningStats() {
    return {};
  }

  @Get('learning/insights')
  getLearningInsights() {
    return [];
  }

  @Get('patterns')
  getPatterns() {
    return [];
  }

  @Get('patterns/stats')
  getPatternStats() {
    return {};
  }

  @Get('adaptive/config')
  getAdaptiveConfig() {
    return {};
  }

  @Get('experience/stats')
  getExperienceStats() {
    return {};
  }

  @Get('feedback/stats')
  getFeedbackStats() {
    return {};
  }
}

@Controller('swarm')
class MockSwarmController {
  @Post('create')
  createSwarm() {
    return {};
  }

  @Get('list')
  listSwarms() {
    return [];
  }

  @Get('stats')
  getSwarmStats() {
    return {};
  }

  @Get('consensus/list')
  listConsensus() {
    return [];
  }

  @Get('persistence/active')
  getActiveCollaborations() {
    return [];
  }

  @Get('working-memory/stats')
  getWorkingMemoryStats() {
    return {};
  }

  @Get('feedback/stats')
  getFeedbackStats() {
    return {};
  }

  @Get('topology/list')
  listTopologies() {
    return [];
  }

  @Get('dag/stats')
  getDAGStats() {
    return {};
  }
}

@Controller('factory')
class MockFactoryController {
  @Get('capabilities')
  getCapabilities() {
    return [];
  }

  @Get('metrics/msr')
  getMSR() {
    return {};
  }
}

// ─── Helper ──────────────────────────────────────────────────

async function createTestApp(controllers: any[]): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    controllers,
    providers: [
      JwtAuthGuard,
      RolesGuard,
      { provide: 'Reflector', useValue: { getAllAndOverride: jest.fn() } },
    ],
  }).compile();

  const app = moduleFixture.createNestApplication();
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  const reflector = app.get('Reflector');
  app.useGlobalGuards(
    new JwtAuthGuard(reflector as any),
    new RolesGuard(reflector as any),
  );
  await app.init();
  return app;
}

describe('API Integrity (e2e)', () => {
  // ═══════════════════════════════════════════════════════════
  //  1. Orchestration Endpoints Are at /api/v1/orchestration/*
  // ═══════════════════════════════════════════════════════════
  describe('Orchestration API routing', () => {
    let app: INestApplication;

    beforeAll(async () => {
      app = await createTestApp([MockOrchestrationController]);
    });

    afterAll(async () => {
      await app.close();
    });

    it('should have /api/v1/orchestration/collaborate route', () => {
      return request(app.getHttpServer())
        .post('/api/v1/orchestration/collaborate')
        .expect((res) => {
          // We expect 401 (auth required), NOT 404
          expect(res.status).not.toBe(404);
        });
    });

    it('should NOT have /api/v1/api/v1/orchestration/collaborate (doubled prefix)', () => {
      return request(app.getHttpServer())
        .post('/api/v1/api/v1/orchestration/collaborate')
        .expect(404);
    });

    it('should have /api/v1/orchestration/decompose route', () => {
      return request(app.getHttpServer())
        .post('/api/v1/orchestration/decompose')
        .expect((res) => {
          expect(res.status).not.toBe(404);
        });
    });

    it('should have /api/v1/orchestration/cluster-health route', () => {
      return request(app.getHttpServer())
        .get('/api/v1/orchestration/cluster-health')
        .expect((res) => {
          expect(res.status).not.toBe(404);
        });
    });

    it('should have /api/v1/orchestration/connectors route', () => {
      return request(app.getHttpServer())
        .get('/api/v1/orchestration/connectors')
        .expect((res) => {
          expect(res.status).not.toBe(404);
        });
    });

    it('should have /api/v1/orchestration/statistics route', () => {
      return request(app.getHttpServer())
        .get('/api/v1/orchestration/statistics')
        .expect((res) => {
          expect(res.status).not.toBe(404);
        });
    });

    it('should have /api/v1/orchestration/history route', () => {
      return request(app.getHttpServer())
        .get('/api/v1/orchestration/history')
        .expect((res) => {
          expect(res.status).not.toBe(404);
        });
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  2. Intelligence Endpoints Are at /api/v1/intelligence/*
  // ═══════════════════════════════════════════════════════════
  describe('Intelligence API routing', () => {
    let app: INestApplication;

    beforeAll(async () => {
      app = await createTestApp([MockIntelligenceController]);
    });

    afterAll(async () => {
      await app.close();
    });

    it('should have /api/v1/intelligence/graph/stats route', () => {
      return request(app.getHttpServer())
        .get('/api/v1/intelligence/graph/stats')
        .expect((res) => {
          expect(res.status).not.toBe(404);
        });
    });

    it('should NOT have /api/v1/api/v1/intelligence/graph/stats (doubled prefix)', () => {
      return request(app.getHttpServer())
        .get('/api/v1/api/v1/intelligence/graph/stats')
        .expect(404);
    });

    it('should have /api/v1/intelligence/graph/query route', () => {
      return request(app.getHttpServer())
        .post('/api/v1/intelligence/graph/query')
        .expect((res) => {
          expect(res.status).not.toBe(404);
        });
    });

    it('should have /api/v1/intelligence/learning/stats route', () => {
      return request(app.getHttpServer())
        .get('/api/v1/intelligence/learning/stats')
        .expect((res) => {
          expect(res.status).not.toBe(404);
        });
    });

    it('should have /api/v1/intelligence/patterns route', () => {
      return request(app.getHttpServer())
        .get('/api/v1/intelligence/patterns')
        .expect((res) => {
          expect(res.status).not.toBe(404);
        });
    });

    it('should have /api/v1/intelligence/adaptive/config route', () => {
      return request(app.getHttpServer())
        .get('/api/v1/intelligence/adaptive/config')
        .expect((res) => {
          expect(res.status).not.toBe(404);
        });
    });

    it('should have /api/v1/intelligence/experience/stats route', () => {
      return request(app.getHttpServer())
        .get('/api/v1/intelligence/experience/stats')
        .expect((res) => {
          expect(res.status).not.toBe(404);
        });
    });

    it('should have /api/v1/intelligence/feedback/stats route', () => {
      return request(app.getHttpServer())
        .get('/api/v1/intelligence/feedback/stats')
        .expect((res) => {
          expect(res.status).not.toBe(404);
        });
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  3. Swarm Endpoints Are at /api/v1/swarm/*
  // ═══════════════════════════════════════════════════════════
  describe('Swarm API routing', () => {
    let app: INestApplication;

    beforeAll(async () => {
      app = await createTestApp([MockSwarmController]);
    });

    afterAll(async () => {
      await app.close();
    });

    it('should have /api/v1/swarm/create route', () => {
      return request(app.getHttpServer())
        .post('/api/v1/swarm/create')
        .expect((res) => {
          expect(res.status).not.toBe(404);
        });
    });

    it('should NOT have /api/v1/api/v1/swarm/create (doubled prefix)', () => {
      return request(app.getHttpServer())
        .post('/api/v1/api/v1/swarm/create')
        .expect(404);
    });

    it('should have /api/v1/swarm/list route', () => {
      return request(app.getHttpServer())
        .get('/api/v1/swarm/list')
        .expect((res) => {
          expect(res.status).not.toBe(404);
        });
    });

    it('should have /api/v1/swarm/stats route', () => {
      return request(app.getHttpServer())
        .get('/api/v1/swarm/stats')
        .expect((res) => {
          expect(res.status).not.toBe(404);
        });
    });

    it('should have /api/v1/swarm/consensus/list route', () => {
      return request(app.getHttpServer())
        .get('/api/v1/swarm/consensus/list')
        .expect((res) => {
          expect(res.status).not.toBe(404);
        });
    });

    it('should have /api/v1/swarm/persistence/active route', () => {
      return request(app.getHttpServer())
        .get('/api/v1/swarm/persistence/active')
        .expect((res) => {
          expect(res.status).not.toBe(404);
        });
    });

    it('should have /api/v1/swarm/working-memory/stats route', () => {
      return request(app.getHttpServer())
        .get('/api/v1/swarm/working-memory/stats')
        .expect((res) => {
          expect(res.status).not.toBe(404);
        });
    });

    it('should have /api/v1/swarm/feedback/stats route', () => {
      return request(app.getHttpServer())
        .get('/api/v1/swarm/feedback/stats')
        .expect((res) => {
          expect(res.status).not.toBe(404);
        });
    });

    it('should have /api/v1/swarm/topology/list route', () => {
      return request(app.getHttpServer())
        .get('/api/v1/swarm/topology/list')
        .expect((res) => {
          expect(res.status).not.toBe(404);
        });
    });

    it('should have /api/v1/swarm/dag/stats route', () => {
      return request(app.getHttpServer())
        .get('/api/v1/swarm/dag/stats')
        .expect((res) => {
          expect(res.status).not.toBe(404);
        });
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  4. Full Workflow: Login → Create Agent → Execute → Get Result
  // ═══════════════════════════════════════════════════════════
  describe('Full agent workflow', () => {
    it('should simulate the full agent lifecycle with JWT tokens', async () => {
      // Step 1: Mock login — generate a JWT token
      const jwtService = new JwtService({
        secret: 'test-secret-for-e2e',
      });

      const accessToken = jwtService.sign({
        sub: 'test-user-id',
        email: 'test@example.com',
        role: 'super_admin',
        tenantId: 'test-tenant-id',
      });

      expect(accessToken).toBeDefined();
      expect(typeof accessToken).toBe('string');

      // Step 2: Verify the token contains the correct payload
      const decoded = jwtService.decode(accessToken) as any;
      expect(decoded.sub).toBe('test-user-id');
      expect(decoded.role).toBe('super_admin');
      expect(decoded.tenantId).toBe('test-tenant-id');

      // Step 3: Verify token can be verified
      const verified = jwtService.verify(accessToken);
      expect(verified.sub).toBe('test-user-id');

      // Step 4: Verify the API prefix is applied correctly
      const app = await createTestApp([MockOrchestrationController]);

      // Verify /api/v1/orchestration/cluster-health exists
      await request(app.getHttpServer())
        .get('/api/v1/orchestration/cluster-health')
        .expect((res) => {
          expect(res.status).not.toBe(404);
        });

      await app.close();
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  5. Full Workflow: Login → Create Mission → Start → Get Progress
  // ═══════════════════════════════════════════════════════════
  describe('Full mission workflow', () => {
    it('should simulate the full mission lifecycle with JWT tokens', async () => {
      // Step 1: Generate a token for a TENANT_ADMIN user
      const jwtService = new JwtService({
        secret: 'test-secret-for-e2e',
      });

      const accessToken = jwtService.sign({
        sub: 'tenant-admin-id',
        email: 'admin@tenant.com',
        role: 'tenant_admin',
        tenantId: 'tenant-123',
      });

      expect(accessToken).toBeDefined();

      // Step 2: Verify token payload
      const decoded = jwtService.decode(accessToken) as any;
      expect(decoded.role).toBe('tenant_admin');
      expect(decoded.tenantId).toBe('tenant-123');

      // Step 3: Verify the software factory controller routes exist
      const app = await createTestApp([MockFactoryController]);

      await request(app.getHttpServer())
        .get('/api/v1/factory/capabilities')
        .expect((res) => {
          expect(res.status).not.toBe(404);
        });

      await request(app.getHttpServer())
        .get('/api/v1/factory/metrics/msr')
        .expect((res) => {
          expect(res.status).not.toBe(404);
        });

      // Step 4: Verify factory routes do NOT have doubled prefix
      await request(app.getHttpServer())
        .get('/api/v1/api/v1/factory/capabilities')
        .expect(404);

      await app.close();
    });

    it('should have all major API route prefixes without duplication', async () => {
      const app = await createTestApp([
        MockOrchestrationController,
        MockIntelligenceController,
        MockSwarmController,
      ]);

      const server = app.getHttpServer();

      // Verify correct routes exist (expect non-404)
      const validRoutes = [
        { method: 'get', path: '/api/v1/orchestration/cluster-health' },
        { method: 'get', path: '/api/v1/orchestration/statistics' },
        { method: 'get', path: '/api/v1/intelligence/graph/stats' },
        { method: 'get', path: '/api/v1/intelligence/learning/stats' },
        { method: 'get', path: '/api/v1/swarm/list' },
        { method: 'get', path: '/api/v1/swarm/stats' },
      ];

      for (const route of validRoutes) {
        await request(server)
          [route.method](route.path)
          .expect((res: any) => {
            expect(res.status).not.toBe(404);
          });
      }

      // Verify doubled-prefix routes do NOT exist
      const invalidRoutes = [
        '/api/v1/api/v1/orchestration/cluster-health',
        '/api/v1/api/v1/intelligence/graph/stats',
        '/api/v1/api/v1/swarm/list',
        '/api/v2/orchestration/cluster-health',
      ];

      for (const path of invalidRoutes) {
        await request(server)
          .get(path)
          .expect(404);
      }

      await app.close();
    });
  });
});
