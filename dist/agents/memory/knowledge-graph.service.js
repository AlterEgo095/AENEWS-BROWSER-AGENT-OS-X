"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var KnowledgeGraphService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.KnowledgeGraphService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const uuid_1 = require("uuid");
let KnowledgeGraphService = KnowledgeGraphService_1 = class KnowledgeGraphService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(KnowledgeGraphService_1.name);
        this.neo4jDriver = null;
        this.nodes = new Map();
        this.relationships = new Map();
        this.labelIndex = new Map();
        this.relationshipTypeIndex = new Map();
        this.sourceNodeIndex = new Map();
        this.targetNodeIndex = new Map();
        this.schema = {
            labels: new Set(),
            relationshipTypes: new Set(),
            propertyIndexes: new Map(),
        };
    }
    async onModuleInit() {
        await this.initializeDriver();
        this.logger.log('Knowledge Graph service initialized');
    }
    async onModuleDestroy() {
        if (this.neo4jDriver) {
            try {
                await this.neo4jDriver.close();
            }
            catch {
            }
        }
    }
    async initializeDriver() {
        try {
            const neo4j = await Promise.resolve().then(() => __importStar(require('neo4j-driver')));
            const uri = this.configService.get('NEO4J_URI', 'bolt://localhost:7687');
            const username = this.configService.get('NEO4J_USERNAME', 'neo4j');
            const password = this.configService.get('NEO4J_PASSWORD', 'password');
            this.neo4jDriver = neo4j.default.driver(uri, neo4j.default.auth.basic(username, password));
            const session = this.neo4jDriver.session();
            try {
                await session.run('RETURN 1');
                this.logger.log('Connected to Neo4j');
            }
            finally {
                await session.close();
            }
        }
        catch (error) {
            this.logger.warn(`Neo4j not available, using in-memory knowledge graph: ${error.message}`);
            this.neo4jDriver = null;
        }
    }
    async addNode(label, properties) {
        const id = (0, uuid_1.v4)();
        const now = new Date();
        const node = {
            id,
            label,
            properties,
            createdAt: now,
            updatedAt: now,
        };
        if (this.neo4jDriver) {
            try {
                await this.executeNeo4jQuery(`CREATE (n:${this.sanitizeLabel(label)} {id: $id, properties: $properties, createdAt: datetime(), updatedAt: datetime()}) RETURN n`, { id, properties: JSON.stringify(properties) });
            }
            catch (error) {
                this.logger.warn(`Neo4j write failed, using in-memory: ${error.message}`);
            }
        }
        this.nodes.set(id, node);
        if (!this.labelIndex.has(label)) {
            this.labelIndex.set(label, new Set());
        }
        this.labelIndex.get(label).add(id);
        this.schema.labels.add(label);
        if (properties) {
            for (const propKey of Object.keys(properties)) {
                if (!this.schema.propertyIndexes.has(label)) {
                    this.schema.propertyIndexes.set(label, new Set());
                }
                this.schema.propertyIndexes.get(label).add(propKey);
            }
        }
        return node;
    }
    async getNode(id) {
        const node = this.nodes.get(id);
        return node ? { ...node, properties: { ...node.properties } } : null;
    }
    async updateNode(id, properties) {
        const node = this.nodes.get(id);
        if (!node)
            return null;
        node.properties = { ...node.properties, ...properties };
        node.updatedAt = new Date();
        if (this.neo4jDriver) {
            try {
                await this.executeNeo4jQuery(`MATCH (n {id: $id}) SET n.properties = $properties, n.updatedAt = datetime() RETURN n`, { id, properties: JSON.stringify(node.properties) });
            }
            catch (error) {
                this.logger.warn(`Neo4j update failed: ${error.message}`);
            }
        }
        if (properties) {
            const labelSchema = this.schema.propertyIndexes.get(node.label);
            if (labelSchema) {
                for (const propKey of Object.keys(properties)) {
                    labelSchema.add(propKey);
                }
            }
        }
        return { ...node, properties: { ...node.properties } };
    }
    async deleteNode(id) {
        const node = this.nodes.get(id);
        if (!node)
            return false;
        const labelSet = this.labelIndex.get(node.label);
        if (labelSet) {
            labelSet.delete(id);
            if (labelSet.size === 0) {
                this.labelIndex.delete(node.label);
            }
        }
        for (const [relId, rel] of this.relationships) {
            if (rel.sourceId === id || rel.targetId === id) {
                this.removeRelationshipIndexes(relId, rel);
                this.relationships.delete(relId);
            }
        }
        this.sourceNodeIndex.delete(id);
        this.targetNodeIndex.delete(id);
        this.nodes.delete(id);
        if (this.neo4jDriver) {
            try {
                await this.executeNeo4jQuery(`MATCH (n {id: $id}) DETACH DELETE n`, { id });
            }
            catch (error) {
                this.logger.warn(`Neo4j delete failed: ${error.message}`);
            }
        }
        return true;
    }
    async addRelationship(type, sourceId, targetId, properties) {
        const sourceNode = this.nodes.get(sourceId);
        const targetNode = this.nodes.get(targetId);
        if (!sourceNode || !targetNode) {
            throw new Error(`Source node ${sourceId} or target node ${targetId} not found`);
        }
        const id = (0, uuid_1.v4)();
        const now = new Date();
        const relationship = {
            id,
            type,
            sourceId,
            targetId,
            properties: properties || {},
            createdAt: now,
        };
        this.relationships.set(id, relationship);
        if (!this.relationshipTypeIndex.has(type)) {
            this.relationshipTypeIndex.set(type, new Set());
        }
        this.relationshipTypeIndex.get(type).add(id);
        if (!this.sourceNodeIndex.has(sourceId)) {
            this.sourceNodeIndex.set(sourceId, new Set());
        }
        this.sourceNodeIndex.get(sourceId).add(id);
        if (!this.targetNodeIndex.has(targetId)) {
            this.targetNodeIndex.set(targetId, new Set());
        }
        this.targetNodeIndex.get(targetId).add(id);
        this.schema.relationshipTypes.add(type);
        if (this.neo4jDriver) {
            try {
                await this.executeNeo4jQuery(`MATCH (s {id: $sourceId}), (t {id: $targetId}) CREATE (s)-[r:${this.sanitizeLabel(type)} {id: $id, properties: $properties, createdAt: datetime()}]->(t) RETURN r`, { sourceId, targetId, id, properties: JSON.stringify(properties || {}) });
            }
            catch (error) {
                this.logger.warn(`Neo4j relationship create failed: ${error.message}`);
            }
        }
        return relationship;
    }
    async getRelationship(id) {
        const rel = this.relationships.get(id);
        return rel ? { ...rel, properties: { ...rel.properties } } : null;
    }
    async deleteRelationship(id) {
        const rel = this.relationships.get(id);
        if (!rel)
            return false;
        this.removeRelationshipIndexes(id, rel);
        this.relationships.delete(id);
        if (this.neo4jDriver) {
            try {
                await this.executeNeo4jQuery(`MATCH ()-[r {id: $id}]->() DELETE r`, { id });
            }
            catch (error) {
                this.logger.warn(`Neo4j relationship delete failed: ${error.message}`);
            }
        }
        return true;
    }
    async query(query) {
        let matchedNodeIds = new Set();
        if (query.nodeLabel) {
            const labelIds = this.labelIndex.get(query.nodeLabel);
            if (labelIds) {
                matchedNodeIds = new Set(labelIds);
            }
            else {
                return { nodes: [], relationships: [] };
            }
        }
        else {
            matchedNodeIds = new Set(this.nodes.keys());
        }
        if (query.properties) {
            const filteredIds = new Set();
            for (const nodeId of matchedNodeIds) {
                const node = this.nodes.get(nodeId);
                if (node && this.matchesProperties(node.properties, query.properties)) {
                    filteredIds.add(nodeId);
                }
            }
            matchedNodeIds = filteredIds;
        }
        const resultNodes = [];
        for (const nodeId of matchedNodeIds) {
            const node = this.nodes.get(nodeId);
            if (node) {
                resultNodes.push({ ...node, properties: { ...node.properties } });
            }
        }
        let matchedRelIds = new Set();
        if (query.relationshipType) {
            const typeIds = this.relationshipTypeIndex.get(query.relationshipType);
            if (typeIds) {
                matchedRelIds = new Set(typeIds);
            }
        }
        else {
            matchedRelIds = new Set(this.relationships.keys());
        }
        const resultRels = [];
        for (const relId of matchedRelIds) {
            const rel = this.relationships.get(relId);
            if (rel &&
                (matchedNodeIds.has(rel.sourceId) || matchedNodeIds.has(rel.targetId))) {
                resultRels.push({ ...rel, properties: { ...rel.properties } });
            }
        }
        const limit = query.limit || 100;
        return {
            nodes: resultNodes.slice(0, limit),
            relationships: resultRels.slice(0, limit),
        };
    }
    async traverse(startNodeId, depth, relationshipType) {
        const visitedNodes = new Set();
        const visitedRels = new Set();
        const resultNodes = [];
        const resultRels = [];
        const traverseNode = (nodeId, currentDepth) => {
            if (currentDepth > depth || visitedNodes.has(nodeId))
                return;
            visitedNodes.add(nodeId);
            const node = this.nodes.get(nodeId);
            if (node) {
                resultNodes.push({ ...node, properties: { ...node.properties } });
            }
            const outgoingRels = this.sourceNodeIndex.get(nodeId);
            if (outgoingRels) {
                for (const relId of outgoingRels) {
                    if (visitedRels.has(relId))
                        continue;
                    const rel = this.relationships.get(relId);
                    if (!rel)
                        continue;
                    const matchesType = !relationshipType || rel.type === relationshipType;
                    if (matchesType) {
                        visitedRels.add(relId);
                        resultRels.push({ ...rel, properties: { ...rel.properties } });
                        traverseNode(rel.targetId, currentDepth + 1);
                    }
                }
            }
            const incomingRels = this.targetNodeIndex.get(nodeId);
            if (incomingRels) {
                for (const relId of incomingRels) {
                    if (visitedRels.has(relId))
                        continue;
                    const rel = this.relationships.get(relId);
                    if (!rel)
                        continue;
                    const matchesType = !relationshipType || rel.type === relationshipType;
                    if (matchesType) {
                        visitedRels.add(relId);
                        resultRels.push({ ...rel, properties: { ...rel.properties } });
                        traverseNode(rel.sourceId, currentDepth + 1);
                    }
                }
            }
        };
        traverseNode(startNodeId, 0);
        return { nodes: resultNodes, relationships: resultRels };
    }
    async findPath(startNodeId, endNodeId, maxDepth = 10, relationshipType) {
        const visited = new Set();
        const parentMap = new Map();
        const queue = [startNodeId];
        visited.add(startNodeId);
        let found = false;
        while (queue.length > 0 && !found) {
            const currentId = queue.shift();
            if (currentId === endNodeId) {
                found = true;
                break;
            }
            if (parentMap.size >= maxDepth * 10)
                break;
            const outgoingRels = this.sourceNodeIndex.get(currentId);
            if (outgoingRels) {
                for (const relId of outgoingRels) {
                    const rel = this.relationships.get(relId);
                    if (!rel)
                        continue;
                    const matchesType = !relationshipType || rel.type === relationshipType;
                    if (!matchesType)
                        continue;
                    if (!visited.has(rel.targetId)) {
                        visited.add(rel.targetId);
                        parentMap.set(rel.targetId, { nodeId: currentId, relId });
                        queue.push(rel.targetId);
                    }
                }
            }
            const incomingRels = this.targetNodeIndex.get(currentId);
            if (incomingRels) {
                for (const relId of incomingRels) {
                    const rel = this.relationships.get(relId);
                    if (!rel)
                        continue;
                    const matchesType = !relationshipType || rel.type === relationshipType;
                    if (!matchesType)
                        continue;
                    if (!visited.has(rel.sourceId)) {
                        visited.add(rel.sourceId);
                        parentMap.set(rel.sourceId, { nodeId: currentId, relId });
                        queue.push(rel.sourceId);
                    }
                }
            }
        }
        if (!found) {
            return { nodes: [], relationships: [] };
        }
        const pathNodeIds = [endNodeId];
        const pathRelIds = [];
        let current = endNodeId;
        while (current !== startNodeId) {
            const parent = parentMap.get(current);
            if (!parent)
                break;
            pathNodeIds.unshift(parent.nodeId);
            pathRelIds.unshift(parent.relId);
            current = parent.nodeId;
        }
        const resultNodes = [];
        for (const nodeId of pathNodeIds) {
            const node = this.nodes.get(nodeId);
            if (node) {
                resultNodes.push({ ...node, properties: { ...node.properties } });
            }
        }
        const resultRels = [];
        for (const relId of pathRelIds) {
            const rel = this.relationships.get(relId);
            if (rel) {
                resultRels.push({ ...rel, properties: { ...rel.properties } });
            }
        }
        return { nodes: resultNodes, relationships: resultRels };
    }
    getSchema() {
        const propertyIndexes = {};
        for (const [label, props] of this.schema.propertyIndexes) {
            propertyIndexes[label] = Array.from(props);
        }
        return {
            labels: Array.from(this.schema.labels),
            relationshipTypes: Array.from(this.schema.relationshipTypes),
            propertyIndexes,
        };
    }
    addPropertyIndex(label, propertyName) {
        if (!this.schema.propertyIndexes.has(label)) {
            this.schema.propertyIndexes.set(label, new Set());
        }
        this.schema.propertyIndexes.get(label).add(propertyName);
    }
    async executeCypher(query, params) {
        if (this.neo4jDriver) {
            try {
                const result = await this.executeNeo4jQuery(query, params || {});
                return result || [];
            }
            catch (error) {
                this.logger.warn(`Cypher query execution failed: ${error.message}`);
                return [];
            }
        }
        return this.executeInMemoryCypher(query, params || {});
    }
    getStats() {
        return {
            totalNodes: this.nodes.size,
            totalRelationships: this.relationships.size,
            labels: this.labelIndex.size,
            relationshipTypes: this.relationshipTypeIndex.size,
            connectedToNeo4j: this.neo4jDriver !== null,
        };
    }
    matchesProperties(nodeProps, queryProps) {
        for (const [key, value] of Object.entries(queryProps)) {
            if (nodeProps[key] !== value) {
                return false;
            }
        }
        return true;
    }
    sanitizeLabel(label) {
        return label.replace(/[^a-zA-Z0-9_]/g, '_');
    }
    removeRelationshipIndexes(relId, rel) {
        const typeSet = this.relationshipTypeIndex.get(rel.type);
        if (typeSet) {
            typeSet.delete(relId);
            if (typeSet.size === 0) {
                this.relationshipTypeIndex.delete(rel.type);
            }
        }
        const sourceSet = this.sourceNodeIndex.get(rel.sourceId);
        if (sourceSet) {
            sourceSet.delete(relId);
            if (sourceSet.size === 0) {
                this.sourceNodeIndex.delete(rel.sourceId);
            }
        }
        const targetSet = this.targetNodeIndex.get(rel.targetId);
        if (targetSet) {
            targetSet.delete(relId);
            if (targetSet.size === 0) {
                this.targetNodeIndex.delete(rel.targetId);
            }
        }
    }
    async executeNeo4jQuery(query, params) {
        if (!this.neo4jDriver)
            return null;
        const session = this.neo4jDriver.session();
        try {
            const result = await session.run(query, params);
            return result.records;
        }
        finally {
            await session.close();
        }
    }
    executeInMemoryCypher(query, params) {
        const normalizedQuery = query.trim().toLowerCase();
        const matchLabelReturn = normalizedQuery.match(/match\s*\(\s*(\w+)\s*:\s*(\w+)\s*\)\s*return\s*\1/i);
        if (matchLabelReturn) {
            const label = matchLabelReturn[2];
            const labelIds = this.labelIndex.get(label);
            if (!labelIds)
                return [];
            return Array.from(labelIds)
                .map((id) => this.nodes.get(id))
                .filter((n) => n !== undefined)
                .map((n) => ({ id: n.id, label: n.label, properties: n.properties }));
        }
        const matchAllReturn = normalizedQuery.match(/match\s*\(\s*(\w+)\s*\)\s*return\s*\1(?:\s+limit\s+(\d+))?/i);
        if (matchAllReturn) {
            const limit = matchAllReturn[2] ? parseInt(matchAllReturn[2], 10) : 100;
            return Array.from(this.nodes.values())
                .slice(0, limit)
                .map((n) => ({ id: n.id, label: n.label, properties: n.properties }));
        }
        this.logger.warn('In-memory Cypher does not support this query pattern');
        return [];
    }
};
exports.KnowledgeGraphService = KnowledgeGraphService;
exports.KnowledgeGraphService = KnowledgeGraphService = KnowledgeGraphService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], KnowledgeGraphService);
//# sourceMappingURL=knowledge-graph.service.js.map