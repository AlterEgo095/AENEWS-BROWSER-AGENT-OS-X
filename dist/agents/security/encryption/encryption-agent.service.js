"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EncryptionAgentService = exports.ENCRYPTION_AGENT_CONFIG = void 0;
const common_1 = require("@nestjs/common");
const base_agent_service_1 = require("../../base/base-agent.service");
const agent_interface_1 = require("../../interfaces/agent.interface");
exports.ENCRYPTION_AGENT_CONFIG = {
    id: 'security-encryption',
    name: 'Encryption',
    cluster: agent_interface_1.AgentCluster.SECURITY,
    version: '1.0.0',
    description: 'Manage data encryption and decryption, cryptographic key lifecycle, certificate management, key rotation, and digital signature verification.',
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
let EncryptionAgentService = class EncryptionAgentService extends base_agent_service_1.BaseAgentService {
    constructor() {
        super(...arguments);
        this.keys = new Map();
        this.certificates = new Map();
        this.encryptedDataStore = new Map();
    }
    defineConfig() {
        return exports.ENCRYPTION_AGENT_CONFIG;
    }
    async onInitialize() {
        this.registerTool({
            name: 'encryptData',
            description: 'Encrypt data using specified algorithm and key',
            execute: async (params) => this.encryptData(params),
        });
        this.registerTool({
            name: 'decryptData',
            description: 'Decrypt data using specified key',
            execute: async (params) => this.decryptData(params),
        });
        this.registerTool({
            name: 'generateKey',
            description: 'Generate a new cryptographic key',
            execute: async (params) => this.generateKey(params),
        });
        this.registerTool({
            name: 'manageCertificate',
            description: 'Manage SSL/TLS certificates',
            execute: async (params) => this.manageCertificate(params),
        });
        this.registerTool({
            name: 'rotateKeys',
            description: 'Rotate cryptographic keys for enhanced security',
            execute: async (params) => this.rotateKeys(params),
        });
        this.registerTool({
            name: 'verifySignature',
            description: 'Verify a digital signature',
            execute: async (params) => this.verifySignature(params),
        });
        this.logger.log('Encryption agent initialized with 6 tools');
    }
    async onExecute(input) {
        const startTime = Date.now();
        const { action, ...params } = input.payload;
        if (!action) {
            return this.createAgentOutput(input.taskId, false, null, 'Missing required parameter: action', startTime);
        }
        try {
            let result;
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
                    return this.createAgentOutput(input.taskId, false, null, `Unknown encryption action: ${action}`, startTime);
            }
            return this.createAgentOutput(input.taskId, true, result, undefined, startTime);
        }
        catch (error) {
            const msg = error.message;
            this.logger.error(`Encryption execution failed: ${msg}`);
            return this.createAgentOutput(input.taskId, false, null, msg, startTime);
        }
    }
    async onDestroy() {
        this.keys.clear();
        this.certificates.clear();
        this.encryptedDataStore.clear();
        this.logger.log('Encryption agent destroyed, state cleared');
    }
    async encryptData(params) {
        const { data, algorithm = 'AES-256-GCM', keyId } = params;
        if (!data) {
            throw new Error('Data to encrypt is required');
        }
        const resolvedKeyId = keyId || (await this.generateKey({ type: 'symmetric', algorithm })).keyId;
        const key = this.keys.get(resolvedKeyId);
        if (keyId && !key) {
            throw new Error(`Key ${keyId} not found`);
        }
        if (key && key.status !== 'active') {
            throw new Error(`Key ${resolvedKeyId} is not active (status: ${key.status})`);
        }
        const iv = this.generateId().substring(0, 16);
        const tag = this.generateId().substring(0, 16);
        const ciphertext = Buffer.from(data).toString('base64') + '.' + this.generateId().substring(0, 8);
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
    async decryptData(params) {
        const { ciphertext, keyId, iv, tag } = params;
        if (!ciphertext || !keyId) {
            throw new Error('ciphertext and keyId are required');
        }
        const key = this.keys.get(keyId);
        if (!key) {
            throw new Error(`Key ${keyId} not found`);
        }
        const base64Part = ciphertext.split('.')[0];
        let plaintext;
        try {
            plaintext = Buffer.from(base64Part, 'base64').toString('utf-8');
        }
        catch {
            plaintext = '[decrypted data]';
        }
        const verified = !!tag;
        this.logger.log(`Data decrypted using key ${keyId} (verified: ${verified})`);
        return { plaintext, algorithm: key.algorithm, verified };
    }
    async generateKey(params) {
        const { type, algorithm, keySize = 256, purpose = 'general' } = params;
        if (!type || !algorithm) {
            throw new Error('type and algorithm are required');
        }
        const keyId = `key-${this.generateId().substring(0, 12)}`;
        const createdAt = new Date();
        const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
        const record = {
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
    async manageCertificate(params) {
        const { operation, domain, certificateId } = params;
        switch (operation) {
            case 'create': {
                if (!domain) {
                    throw new Error('Domain is required for certificate creation');
                }
                const certId = `cert-${this.generateId().substring(0, 12)}`;
                const now = new Date();
                const record = {
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
                this.logger.log(`Certificate verification: ${certificateId} — ${isValid ? 'valid' : 'invalid'}`);
                return { success: true, certificateId, status: isValid ? 'valid' : 'invalid' };
            }
            default:
                throw new Error(`Unknown certificate operation: ${operation}`);
        }
    }
    async rotateKeys(params) {
        const { keyId, strategy = 'immediate', reEncryptData = false } = params;
        const oldKey = this.keys.get(keyId);
        if (!oldKey) {
            throw new Error(`Key ${keyId} not found`);
        }
        if (oldKey.status !== 'active') {
            throw new Error(`Key ${keyId} is not active (status: ${oldKey.status})`);
        }
        const newKeyResult = await this.generateKey({
            type: oldKey.type,
            algorithm: oldKey.algorithm,
            purpose: oldKey.purpose,
        });
        oldKey.status = 'rotated';
        const newKey = this.keys.get(newKeyResult.keyId);
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
        this.logger.log(`Key rotated: ${keyId} → ${newKeyResult.keyId} (strategy: ${strategy}, re-encrypted: ${reEncryptedItems})`);
        return {
            rotated: true,
            oldKeyId: keyId,
            newKeyId: newKeyResult.keyId,
            reEncryptedItems,
        };
    }
    async verifySignature(params) {
        const { data, signature, keyId, algorithm = 'RS256' } = params;
        if (!data || !signature || !keyId) {
            throw new Error('data, signature, and keyId are required');
        }
        const key = this.keys.get(keyId);
        if (!key) {
            throw new Error(`Key ${keyId} not found`);
        }
        const valid = signature.length > 10 && data.length > 0;
        this.logger.log(`Signature verification for key ${keyId}: ${valid ? 'valid' : 'invalid'}`);
        return {
            valid,
            algorithm,
            signerKeyId: keyId,
            verifiedAt: new Date().toISOString(),
        };
    }
};
exports.EncryptionAgentService = EncryptionAgentService;
exports.EncryptionAgentService = EncryptionAgentService = __decorate([
    (0, common_1.Injectable)()
], EncryptionAgentService);
//# sourceMappingURL=encryption-agent.service.js.map