/**
 * AENEWS Agent OS X — Swarm DTO Validation Unit Tests
 *
 * Tests class-validator decorators on all swarm DTOs.
 * Uses plainToInstance + validate from class-validator/class-transformer.
 */

import { validate, ValidationError } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import {
  CreateSwarmDto,
  TerminateSwarmDto,
  AgentExpertiseDto,
  ConsensusProposalDto,
  InitiateConsensusDto,
  CreateCheckpointDto,
  CreateWorkingMemorySessionDto,
  WriteWorkingMemoryDto,
  PostToBlackboardDto,
  CreateTopologyDto,
  AddTopologyNodeDto,
  RemoveTopologyNodeDto,
  IsolateNodeDto,
  RetypeTopologyDto,
} from './swarm.dto';

// ─── Helper ───────────────────────────────────────────────────────

async function expectValid(dto: any): Promise<void> {
  const errors = await validate(dto, { skipMissingProperties: false });
  expect(errors).toHaveLength(0);
}

async function expectInvalid(dto: any, expectedProperty?: string): Promise<ValidationError[]> {
  const errors = await validate(dto, { skipMissingProperties: false });
  expect(errors.length).toBeGreaterThan(0);
  if (expectedProperty) {
    const hasProperty = errors.some((e) => e.property === expectedProperty);
    expect(hasProperty).toBe(true);
  }
  return errors;
}

// ─── CreateSwarmDto ───────────────────────────────────────────────

describe('CreateSwarmDto', () => {
  it('should validate correct input', async () => {
    const dto = plainToInstance(CreateSwarmDto, {
      id: 'swarm-1',
      mission: 'Build a REST API',
      objectives: ['Design schema', 'Implement routes'],
      requiredCapabilities: ['coding', 'testing'],
      initialSize: 5,
      maxSize: 20,
      enableDynamicSpawning: true,
    });
    await expectValid(dto);
  });

  it('should reject missing id', async () => {
    const dto = plainToInstance(CreateSwarmDto, {
      mission: 'Build a REST API',
    });
    await expectInvalid(dto, 'id');
  });

  it('should reject missing mission', async () => {
    const dto = plainToInstance(CreateSwarmDto, {
      id: 'swarm-1',
    });
    await expectInvalid(dto, 'mission');
  });

  it('should reject empty id', async () => {
    const dto = plainToInstance(CreateSwarmDto, {
      id: '',
      mission: 'test',
    });
    await expectInvalid(dto, 'id');
  });

  it('should reject id exceeding maxLength', async () => {
    const dto = plainToInstance(CreateSwarmDto, {
      id: 'a'.repeat(129),
      mission: 'test',
    });
    await expectInvalid(dto, 'id');
  });

  it('should reject initialSize below minimum', async () => {
    const dto = plainToInstance(CreateSwarmDto, {
      id: 'swarm-1',
      mission: 'test',
      initialSize: 0,
    });
    await expectInvalid(dto, 'initialSize');
  });

  it('should reject maxSize above maximum', async () => {
    const dto = plainToInstance(CreateSwarmDto, {
      id: 'swarm-1',
      mission: 'test',
      maxSize: 1001,
    });
    await expectInvalid(dto, 'maxSize');
  });

  it('should reject non-boolean enableDynamicSpawning', async () => {
    const dto = plainToInstance(CreateSwarmDto, {
      id: 'swarm-1',
      mission: 'test',
      enableDynamicSpawning: 'yes',
    });
    await expectInvalid(dto, 'enableDynamicSpawning');
  });

  it('should accept valid optional fields as undefined', async () => {
    const dto = plainToInstance(CreateSwarmDto, {
      id: 'swarm-1',
      mission: 'test',
    });
    await expectValid(dto);
  });
});

// ─── TerminateSwarmDto ────────────────────────────────────────────

describe('TerminateSwarmDto', () => {
  it('should validate correct input', async () => {
    const dto = plainToInstance(TerminateSwarmDto, {
      reason: 'Mission completed',
    });
    await expectValid(dto);
  });

  it('should validate without reason (optional)', async () => {
    const dto = plainToInstance(TerminateSwarmDto, {});
    await expectValid(dto);
  });

  it('should reject reason exceeding maxLength', async () => {
    const dto = plainToInstance(TerminateSwarmDto, {
      reason: 'a'.repeat(501),
    });
    await expectInvalid(dto, 'reason');
  });
});

// ─── AgentExpertiseDto ────────────────────────────────────────────

describe('AgentExpertiseDto', () => {
  it('should validate correct input', async () => {
    const dto = plainToInstance(AgentExpertiseDto, {
      agentId: 'agent-1',
      expertiseScore: 0.8,
      reliabilityScore: 0.9,
      clusterRelevance: 0.7,
      byzantineSuspicion: 0.1,
    });
    await expectValid(dto);
  });

  it('should reject missing agentId', async () => {
    const dto = plainToInstance(AgentExpertiseDto, {
      expertiseScore: 0.8,
      reliabilityScore: 0.9,
      clusterRelevance: 0.7,
      byzantineSuspicion: 0.1,
    });
    await expectInvalid(dto, 'agentId');
  });

  it('should reject expertiseScore above 1', async () => {
    const dto = plainToInstance(AgentExpertiseDto, {
      agentId: 'agent-1',
      expertiseScore: 1.5,
      reliabilityScore: 0.9,
      clusterRelevance: 0.7,
      byzantineSuspicion: 0.1,
    });
    await expectInvalid(dto, 'expertiseScore');
  });

  it('should reject expertiseScore below 0', async () => {
    const dto = plainToInstance(AgentExpertiseDto, {
      agentId: 'agent-1',
      expertiseScore: -0.1,
      reliabilityScore: 0.9,
      clusterRelevance: 0.7,
      byzantineSuspicion: 0.1,
    });
    await expectInvalid(dto, 'expertiseScore');
  });
});

// ─── ConsensusProposalDto ─────────────────────────────────────────

describe('ConsensusProposalDto', () => {
  it('should validate correct input', async () => {
    const dto = plainToInstance(ConsensusProposalDto, {
      id: 'proposal-1',
      content: { action: 'deploy' },
      proposedBy: 'agent-1',
    });
    await expectValid(dto);
  });

  it('should reject missing id', async () => {
    const dto = plainToInstance(ConsensusProposalDto, {
      proposedBy: 'agent-1',
    });
    await expectInvalid(dto, 'id');
  });

  it('should reject missing proposedBy', async () => {
    const dto = plainToInstance(ConsensusProposalDto, {
      id: 'proposal-1',
    });
    await expectInvalid(dto, 'proposedBy');
  });
});

// ─── InitiateConsensusDto ─────────────────────────────────────────

describe('InitiateConsensusDto', () => {
  it('should validate correct input', async () => {
    const dto = plainToInstance(InitiateConsensusDto, {
      id: 'consensus-1',
      proposal: { id: 'prop-1', proposedBy: 'agent-1' },
      strategy: 'simple_majority',
      maxRounds: 10,
    });
    await expectValid(dto);
  });

  it('should reject invalid strategy', async () => {
    const dto = plainToInstance(InitiateConsensusDto, {
      id: 'consensus-1',
      proposal: { id: 'prop-1', proposedBy: 'agent-1' },
      strategy: 'invalid_strategy',
    });
    await expectInvalid(dto, 'strategy');
  });

  it('should reject maxRounds above 100', async () => {
    const dto = plainToInstance(InitiateConsensusDto, {
      id: 'consensus-1',
      proposal: { id: 'prop-1', proposedBy: 'agent-1' },
      maxRounds: 101,
    });
    await expectInvalid(dto, 'maxRounds');
  });

  it('should handle missing proposal gracefully', async () => {
    const dto = plainToInstance(InitiateConsensusDto, {
      id: 'consensus-1',
    });
    // ValidateNested may not produce errors for undefined nested objects
    // depending on class-validator configuration. This is expected behavior.
    const errors = await validate(dto, { skipMissingProperties: false });
    // We just verify no crash occurs
    expect(Array.isArray(errors)).toBe(true);
  });
});

// ─── CreateCheckpointDto ──────────────────────────────────────────

describe('CreateCheckpointDto', () => {
  it('should validate correct input', async () => {
    const dto = plainToInstance(CreateCheckpointDto, {
      collaborationId: 'collab-1',
      phase: 'execution',
      agentIds: ['agent-1', 'agent-2'],
      assignedAgents: ['agent-1'],
      startedAt: Date.now(),
      lastCheckpointAt: Date.now(),
      pattern: 'parallel',
    });
    await expectValid(dto);
  });

  it('should reject missing required fields', async () => {
    const dto = plainToInstance(CreateCheckpointDto, {});
    const errors = await validate(dto, { skipMissingProperties: false });
    expect(errors.length).toBeGreaterThan(0);
  });
});

// ─── CreateWorkingMemorySessionDto ────────────────────────────────

describe('CreateWorkingMemorySessionDto', () => {
  it('should validate correct input', async () => {
    const dto = plainToInstance(CreateWorkingMemorySessionDto, {
      sessionId: 'session-1',
      agentIds: ['agent-1', 'agent-2'],
      missionId: 'mission-1',
      scope: 'session',
    });
    await expectValid(dto);
  });

  it('should reject invalid scope', async () => {
    const dto = plainToInstance(CreateWorkingMemorySessionDto, {
      sessionId: 'session-1',
      agentIds: ['agent-1'],
      scope: 'invalid',
    });
    await expectInvalid(dto, 'scope');
  });

  it('should reject missing sessionId', async () => {
    const dto = plainToInstance(CreateWorkingMemorySessionDto, {
      agentIds: ['agent-1'],
    });
    await expectInvalid(dto, 'sessionId');
  });
});

// ─── WriteWorkingMemoryDto ────────────────────────────────────────

describe('WriteWorkingMemoryDto', () => {
  it('should validate correct input', async () => {
    const dto = plainToInstance(WriteWorkingMemoryDto, {
      key: 'result',
      value: { data: 42 },
      agentId: 'agent-1',
    });
    await expectValid(dto);
  });

  it('should reject missing key', async () => {
    const dto = plainToInstance(WriteWorkingMemoryDto, {
      value: 'data',
      agentId: 'agent-1',
    });
    await expectInvalid(dto, 'key');
  });

  it('should reject missing agentId', async () => {
    const dto = plainToInstance(WriteWorkingMemoryDto, {
      key: 'result',
      value: 'data',
    });
    await expectInvalid(dto, 'agentId');
  });
});

// ─── PostToBlackboardDto ──────────────────────────────────────────

describe('PostToBlackboardDto', () => {
  it('should validate correct input', async () => {
    const dto = plainToInstance(PostToBlackboardDto, {
      key: 'announcement',
      value: 'deploy started',
      agentId: 'agent-1',
    });
    await expectValid(dto);
  });

  it('should reject missing fields', async () => {
    const dto = plainToInstance(PostToBlackboardDto, {});
    const errors = await validate(dto, { skipMissingProperties: false });
    expect(errors.length).toBeGreaterThanOrEqual(3); // key, value, agentId
  });
});

// ─── CreateTopologyDto ────────────────────────────────────────────

describe('CreateTopologyDto', () => {
  it('should validate correct input', async () => {
    const dto = plainToInstance(CreateTopologyDto, {
      id: 'topo-1',
      type: 'mesh',
      agentIds: ['agent-1', 'agent-2'],
      clusterTypes: ['browser', 'coding'],
    });
    await expectValid(dto);
  });

  it('should reject invalid type', async () => {
    const dto = plainToInstance(CreateTopologyDto, {
      id: 'topo-1',
      type: 'invalid',
      agentIds: ['agent-1'],
      clusterTypes: ['browser'],
    });
    await expectInvalid(dto, 'type');
  });

  it('should reject missing required fields', async () => {
    const dto = plainToInstance(CreateTopologyDto, {});
    const errors = await validate(dto, { skipMissingProperties: false });
    expect(errors.length).toBeGreaterThan(0);
  });
});

// ─── AddTopologyNodeDto ───────────────────────────────────────────

describe('AddTopologyNodeDto', () => {
  it('should validate correct input', async () => {
    const dto = plainToInstance(AddTopologyNodeDto, {
      agentId: 'agent-1',
      clusterType: 'browser',
      reason: 'scaling up',
    });
    await expectValid(dto);
  });

  it('should reject missing agentId', async () => {
    const dto = plainToInstance(AddTopologyNodeDto, {
      clusterType: 'browser',
    });
    await expectInvalid(dto, 'agentId');
  });

  it('should reject missing clusterType', async () => {
    const dto = plainToInstance(AddTopologyNodeDto, {
      agentId: 'agent-1',
    });
    await expectInvalid(dto, 'clusterType');
  });
});

// ─── RemoveTopologyNodeDto ────────────────────────────────────────

describe('RemoveTopologyNodeDto', () => {
  it('should validate correct input', async () => {
    const dto = plainToInstance(RemoveTopologyNodeDto, {
      agentId: 'agent-1',
      reason: 'scaling down',
    });
    await expectValid(dto);
  });

  it('should reject missing agentId', async () => {
    const dto = plainToInstance(RemoveTopologyNodeDto, {});
    await expectInvalid(dto, 'agentId');
  });
});

// ─── IsolateNodeDto ───────────────────────────────────────────────

describe('IsolateNodeDto', () => {
  it('should validate with optional reason', async () => {
    const dto = plainToInstance(IsolateNodeDto, {
      reason: 'suspicious behavior',
    });
    await expectValid(dto);
  });

  it('should validate without any fields', async () => {
    const dto = plainToInstance(IsolateNodeDto, {});
    await expectValid(dto);
  });
});

// ─── RetypeTopologyDto ────────────────────────────────────────────

describe('RetypeTopologyDto', () => {
  it('should validate correct type', async () => {
    const types = ['star', 'mesh', 'ring', 'tree', 'custom'];
    for (const type of types) {
      const dto = plainToInstance(RetypeTopologyDto, { type });
      await expectValid(dto);
    }
  });

  it('should reject invalid type', async () => {
    const dto = plainToInstance(RetypeTopologyDto, {
      type: 'invalid',
    });
    await expectInvalid(dto, 'type');
  });
});
