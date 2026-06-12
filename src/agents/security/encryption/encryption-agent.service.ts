/**
 * AENEWS Agent OS X - Encryption Agent
 * Manages data encryption/decryption, key management, certificate lifecycle,
 * key rotation, and digital signature verification.
 */

import { Injectable } from '@nestjs/common';
import { BaseAgentService } from '../../base/base-agent.service';
import {
  AgentConfig,
  AgentCluster,
  AgentInput,
  AgentOutput,
} from '../../interfaces/agent.interface';

// ─── Agent Configuration ──────────────────────────────────────────

export const ENCRYPTION_AGENT_CONFIG: AgentConfig = {
  id: 'security-encryption',
  name: 'Encryption',
  cluster: AgentCluster.SECURITY,
  version: '1.0.0',
  description:
    'Manage data encryption and decryption, cryptographic key lifecycle, certificate management, key rotation, and digital signature verification.',
  capabilities: [
    {
      name: 'encryptData',
      description: 'Encrypt data using specified algorithm and key',
      inputSchema: {
        type: 'object',
        properties: {
          data: { type: 'string', description: 'Data to encrypt' },
          algorithm: {
            type: 'string',
            enum: ['AES-256-GCM', 'AES-128-CBC', 'RSA-2048', 'RSA-4096'],
            description: 'Encryption algorithm',
          },
          keyId: { type: 'string', description: 'ID of encryption key to use' },
        },
        required: ['data', 'algorithm'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          ciphertext: { type: 'string' },
          algorithm: { type: 'string' },
          keyId: { type: 'string' },
          iv: { type: 'string' },
          tag: { type: 'string' },
        },
      },
    },
    {
      name: 'decryptData',
      description: 'Decrypt data using specified key',
      inputSchema: {
        type: 'object',
        properties: {
          ciphertext: { type: 'string', description: 'Data to decrypt' },
          keyId: { type: 'string', description: 'ID of decryption key' },
          iv: { type: 'string', description: 'Initialization vector' },
          tag: { type: 'string', description: 'Authentication tag' },
        },
        required: ['ciphertext', 'keyId'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          plaintext: { type: 'string' },
          algorithm: { type: 'string' },
          verified: { type: 'boolean' },
        },
      },
    },
    {
      name: 'generateKey',
      description: 'Generate a new cryptographic key',
      inputSchema: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['symmetric', 'asymmetric', 'hmac'],
            description: 'Key type',
          },
          algorithm: { type: 'string', description: 'Algorithm for the key' },
          keySize: { type: 'number', description: 'Key size in bits' },
          purpose: { type: 'string', description: 'Purpose of the key' },
        },
        required: ['type', 'algorithm'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          keyId: { type: 'string' },
          type: { type: 'string' },
          algorithm: { type: 'string' },
          createdAt: { type: 'string' },
          expiresAt: { type: 'string' },
        },
      },
    },
    {
      name: 'manageCertificate',
      description: 'Manage SSL/TLS certificates',
      inputSchema: {
        type: 'object',
        properties: {
          operation: {
            type: 'string',
            enum: ['create', 'renew', 'revoke', 'list', 'verify'],
            description: 'Certificate operation',
          },
          domain: { type: 'string', description: 'Domain for the certificate' },
          certificateId: { type: 'string', description: 'Certificate ID for operations' },
        },
        required: ['operation'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          certificateId: { type: 'string' },
          status: { type: 'string' },
          expiresAt: { type: 'string' },
        },
      },
    },
    {
      name: 'rotateKeys',
      description: 'Rotate cryptographic keys for enhanced security',
      inputSchema: {
        type: 'object',
        properties: {
          keyId: { type: 'string', description: 'Key to rotate' },
          strategy: {
            type: 'string',
            enum: ['immediate', 'gradual', 'scheduled'],
            description: 'Rotation strategy',
          },
          reEncryptData: {
            type: 'boolean',
            description: 'Whether to re-encrypt data with new key',
          },
        },
        required: ['keyId'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          rotated: { type: 'boolean' },
          oldKeyId: { type: 'string' },
          newKeyId: { type: 'string' },
          reEncryptedItems: { type: 'number' },
        },
      },
    },
    {
      name: 'verifySignature',
      description: 'Verify a digital signature',
      inputSchema: {
        type: 'object',
        properties: {
          data: { type: 'string', description: 'Original data that was signed' },
          signature: { type: 'string', description: 'Digital signature to verify' },
          keyId: { type: 'string', description: 'Public key ID for verification' },
          algorithm: { type: 'string', description: 'Signature algorithm' },
        },
        required: ['data', 'signature', 'keyId'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          valid: { type: 'boolean' },
          algorithm: { type: 'string' },
          signerKeyId: { type: 'string' },
          verifiedAt: { type: 'string' },
        },
      },
    },
  ],
  permissions: [
    'execute:task',
    'read:encryption',
    'write:encryption',
    'manage:keys',
    'manage:certificates',
    'sign:data',
  ],
  maxConcurrentTasks: 5,
  timeout: 30000,
  retryPolicy: {
    maxRetries: 2,
    backoffMs: 1000,
    exponentialBackoff: true,
  },
};

// ─── Internal Types ───────────────────────────────────────────────

interface KeyRecord {
  keyId: string;
  type: string;
  algorithm: string;
  purpose: string;
  createdAt: Date;
  expiresAt: Date;
  status: 'active' | 'rotated' | 'revoked';
  rotatedFrom?: string;
}

interface CertificateRecord {
  certificateId: string;
  domain: string;
  status: 'active' | 'expired' | 'revoked' | 'pending';
  issuedAt: Date;
  expiresAt: Date;
  issuer: string;
}

// ─── Agent Service ────────────────────────────────────────────────

@Injectable()
export class EncryptionAgentService extends BaseAgentService {
  private keys: Map<string, KeyRecord> = new Map();
  private certificates: Map<string, CertificateRecord> = new Map();
  private encryptedDataStore: Map<
    string,
    { ciphertext: string; keyId: string; algorithm: string; iv?: string; tag?: string }
  > = new Map();

  protected defineConfig(): AgentConfig {
    return ENCRYPTION_AGENT_CONFIG;
  }

  protected async onInitialize(): Promise<void> {
    this.registerTool({
      name: 'encryptData',
      description: 'Encrypt data using specified algorithm and key',
      execute: async (params: { data: string; algorithm: string; keyId?: string }) =>
        this.encryptData(params),
    });

    this.registerTool({
      name: 'decryptData',
      description: 'Decrypt data using specified key',
      execute: async (params: { ciphertext: string; keyId: string; iv?: string; tag?: string }) =>
        this.decryptData(params),
    });

    this.registerTool({
      name: 'generateKey',
      description: 'Generate a new cryptographic key',
      execute: async (params: {
        type: string;
        algorithm: string;
        keySize?: number;
        purpose?: string;
      }) => this.generateKey(params),
    });

    this.registerTool({
      name: 'manageCertificate',
      description: 'Manage SSL/TLS certificates',
      execute: async (params: { operation: string; domain?: string; certificateId?: string }) =>
        this.manageCertificate(params),
    });

    this.registerTool({
      name: 'rotateKeys',
      description: 'Rotate cryptographic keys for enhanced security',
      execute: async (params: { keyId: string; strategy?: string; reEncryptData?: boolean }) =>
        this.rotateKeys(params),
    });

    this.registerTool({
      name: 'verifySignature',
      description: 'Verify a digital signature',
      execute: async (params: {
        data: string;
        signature: string;
        keyId: string;
        algorithm?: string;
      }) => this.verifySignature(params),
    });

    this.logger.log('Encryption agent initialized with 6 tools');
  }

  protected async onExecute(input: AgentInput): Promise<AgentOutput> {
    const startTime = Date.now();
    const { action, ...params } = input.payload;

    if (!action) {
      return this.createAgentOutput(
        input.taskId,
        false,
        null,
        'Missing required parameter: action',
        startTime,
      );
    }

    try {
      let result: any;

      switch (action) {
        case 'encryptData':
          result = await this.encryptData(params);
          break;
        case 'decryptData':
          result = await this.decryptData(params);
          break;
        case 'generateKey':
          result = await this.generateKey(params);
          break;
        case 'manageCertificate':
          result = await this.manageCertificate(params);
          break;
        case 'rotateKeys':
          result = await this.rotateKeys(params);
          break;
        case 'verifySignature':
          result = await this.verifySignature(params);
          break;
        default:
          return this.createAgentOutput(
            input.taskId,
            false,
            null,
            `Unknown encryption action: ${action}`,
            startTime,
          );
      }

      return this.createAgentOutput(input.taskId, true, result, undefined, startTime);
    } catch (error) {
      const msg = (error as Error).message;
      this.logger.error(`Encryption execution failed: ${msg}`);
      return this.createAgentOutput(input.taskId, false, null, msg, startTime);
    }
  }

  protected async onDestroy(): Promise<void> {
    this.keys.clear();
    this.certificates.clear();
    this.encryptedDataStore.clear();
    this.logger.log('Encryption agent destroyed, state cleared');
  }

  // ─── Tool Implementations ──────────────────────────────────────

  private async encryptData(params: {
    data: string;
    algorithm: string;
    keyId?: string;
  }): Promise<{ ciphertext: string; algorithm: string; keyId: string; iv: string; tag: string }> {
    const { data, algorithm = 'AES-256-GCM', keyId } = params;

    if (!data) {
      throw new Error('Data to encrypt is required');
    }

    // Use provided key or generate one
    const resolvedKeyId = keyId || (await this.generateKey({ type: 'symmetric', algorithm })).keyId;
    const key = this.keys.get(resolvedKeyId);

    if (keyId && !key) {
      throw new Error(`Key ${keyId} not found`);
    }
    if (key && key.status !== 'active') {
      throw new Error(`Key ${resolvedKeyId} is not active (status: ${key.status})`);
    }

    // Simulate encryption
    const iv = this.generateId().substring(0, 16);
    const tag = this.generateId().substring(0, 16);
    const ciphertext =
      Buffer.from(data).toString('base64') + '.' + this.generateId().substring(0, 8);
    const storeId = this.generateId();

    this.encryptedDataStore.set(storeId, {
      ciphertext,
      keyId: resolvedKeyId,
      algorithm,
      iv,
      tag,
    });

    this.logger.log(`Data encrypted with ${algorithm} using key ${resolvedKeyId}`);

    return { ciphertext, algorithm, keyId: resolvedKeyId, iv, tag };
  }

  private async decryptData(params: {
    ciphertext: string;
    keyId: string;
    iv?: string;
    tag?: string;
  }): Promise<{ plaintext: string; algorithm: string; verified: boolean }> {
    const { ciphertext, keyId, iv, tag } = params;

    if (!ciphertext || !keyId) {
      throw new Error('ciphertext and keyId are required');
    }

    const key = this.keys.get(keyId);
    if (!key) {
      throw new Error(`Key ${keyId} not found`);
    }

    // Simulate decryption
    const base64Part = ciphertext.split('.')[0];
    let plaintext: string;
    try {
      plaintext = Buffer.from(base64Part, 'base64').toString('utf-8');
    } catch {
      plaintext = '[decrypted data]';
    }

    const verified = !!tag;

    this.logger.log(`Data decrypted using key ${keyId} (verified: ${verified})`);

    return { plaintext, algorithm: key.algorithm, verified };
  }

  private async generateKey(params: {
    type: string;
    algorithm: string;
    keySize?: number;
    purpose?: string;
  }): Promise<{
    keyId: string;
    type: string;
    algorithm: string;
    createdAt: string;
    expiresAt: string;
  }> {
    const { type, algorithm, keySize = 256, purpose = 'general' } = params;

    if (!type || !algorithm) {
      throw new Error('type and algorithm are required');
    }

    const keyId = `key-${this.generateId().substring(0, 12)}`;
    const createdAt = new Date();
    const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year

    const record: KeyRecord = {
      keyId,
      type,
      algorithm,
      purpose,
      createdAt,
      expiresAt,
      status: 'active',
    };

    this.keys.set(keyId, record);

    this.logger.log(`Key generated: ${keyId} (${type}/${algorithm}, purpose: ${purpose})`);

    return {
      keyId,
      type,
      algorithm,
      createdAt: createdAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };
  }

  private async manageCertificate(params: {
    operation: string;
    domain?: string;
    certificateId?: string;
  }): Promise<{ success: boolean; certificateId?: string; status?: string; expiresAt?: string }> {
    const { operation, domain, certificateId } = params;

    switch (operation) {
      case 'create': {
        if (!domain) {
          throw new Error('Domain is required for certificate creation');
        }
        const certId = `cert-${this.generateId().substring(0, 12)}`;
        const now = new Date();
        const record: CertificateRecord = {
          certificateId: certId,
          domain,
          status: 'active',
          issuedAt: now,
          expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          issuer: 'AENEWS-CA',
        };
        this.certificates.set(certId, record);
        this.logger.log(`Certificate created: ${certId} for ${domain}`);
        return {
          success: true,
          certificateId: certId,
          status: 'active',
          expiresAt: record.expiresAt.toISOString(),
        };
      }
      case 'renew': {
        const cert = certificateId ? this.certificates.get(certificateId) : null;
        if (!cert) {
          throw new Error(`Certificate ${certificateId} not found`);
        }
        cert.issuedAt = new Date();
        cert.expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
        this.logger.log(`Certificate renewed: ${certificateId}`);
        return {
          success: true,
          certificateId,
          status: 'active',
          expiresAt: cert.expiresAt.toISOString(),
        };
      }
      case 'revoke': {
        const cert = certificateId ? this.certificates.get(certificateId) : null;
        if (!cert) {
          throw new Error(`Certificate ${certificateId} not found`);
        }
        cert.status = 'revoked';
        this.logger.log(`Certificate revoked: ${certificateId}`);
        return { success: true, certificateId, status: 'revoked' };
      }
      case 'list': {
        const certs = Array.from(this.certificates.values());
        this.logger.log(`Listed ${certs.length} certificates`);
        return { success: true, certificateId: 'list', status: `${certs.length} certificates` };
      }
      case 'verify': {
        const cert = certificateId ? this.certificates.get(certificateId) : null;
        const isValid = cert ? cert.status === 'active' && cert.expiresAt > new Date() : false;
        this.logger.log(
          `Certificate verification: ${certificateId} — ${isValid ? 'valid' : 'invalid'}`,
        );
        return { success: true, certificateId, status: isValid ? 'valid' : 'invalid' };
      }
      default:
        throw new Error(`Unknown certificate operation: ${operation}`);
    }
  }

  private async rotateKeys(params: {
    keyId: string;
    strategy?: string;
    reEncryptData?: boolean;
  }): Promise<{ rotated: boolean; oldKeyId: string; newKeyId: string; reEncryptedItems: number }> {
    const { keyId, strategy = 'immediate', reEncryptData = false } = params;

    const oldKey = this.keys.get(keyId);
    if (!oldKey) {
      throw new Error(`Key ${keyId} not found`);
    }
    if (oldKey.status !== 'active') {
      throw new Error(`Key ${keyId} is not active (status: ${oldKey.status})`);
    }

    // Generate new key with same parameters
    const newKeyResult = await this.generateKey({
      type: oldKey.type,
      algorithm: oldKey.algorithm,
      purpose: oldKey.purpose,
    });

    // Mark old key as rotated
    oldKey.status = 'rotated';
    const newKey = this.keys.get(newKeyResult.keyId)!;
    newKey.rotatedFrom = keyId;

    let reEncryptedItems = 0;
    if (reEncryptData) {
      for (const [storeId, entry] of this.encryptedDataStore) {
        if (entry.keyId === keyId) {
          entry.keyId = newKeyResult.keyId;
          reEncryptedItems++;
        }
      }
    }

    this.logger.log(
      `Key rotated: ${keyId} → ${newKeyResult.keyId} (strategy: ${strategy}, re-encrypted: ${reEncryptedItems})`,
    );

    return {
      rotated: true,
      oldKeyId: keyId,
      newKeyId: newKeyResult.keyId,
      reEncryptedItems,
    };
  }

  private async verifySignature(params: {
    data: string;
    signature: string;
    keyId: string;
    algorithm?: string;
  }): Promise<{ valid: boolean; algorithm: string; signerKeyId: string; verifiedAt: string }> {
    const { data, signature, keyId, algorithm = 'RS256' } = params;

    if (!data || !signature || !keyId) {
      throw new Error('data, signature, and keyId are required');
    }

    const key = this.keys.get(keyId);
    if (!key) {
      throw new Error(`Key ${keyId} not found`);
    }

    // Simulate signature verification
    const valid = signature.length > 10 && data.length > 0;

    this.logger.log(`Signature verification for key ${keyId}: ${valid ? 'valid' : 'invalid'}`);

    return {
      valid,
      algorithm,
      signerKeyId: keyId,
      verifiedAt: new Date().toISOString(),
    };
  }
}
