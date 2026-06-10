/**
 * AENEWS Agent OS X - Knowledge Graph Service
 * Neo4j-backed knowledge graph for storing and querying
 * entity relationships and complex knowledge structures.
 * Provides path finding, schema management, and Cypher query support.
 * Graceful fallback to in-memory store when Neo4j is not available.
 */

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import {
  IKnowledgeGraphService,
  KnowledgeNode,
  KnowledgeRelationship,
  KnowledgeGraphQuery,
  KnowledgeGraphResult,
} from '../interfaces/agent-memory.interface';

// ─── Schema Definition ─────────────────────────────────────────────
interface GraphSchema {
  labels: Set<string>;
  relationshipTypes: Set<string>;
  propertyIndexes: Map<string, Set<string>>;
}

@Injectable()
export class KnowledgeGraphService implements IKnowledgeGraphService, OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KnowledgeGraphService.name);
  private neo4jDriver: any = null;
  private readonly nodes: Map<string, KnowledgeNode> = new Map();
  private readonly relationships: Map<string, KnowledgeRelationship> = new Map();
  private readonly labelIndex: Map<string, Set<string>> = new Map();
  private readonly relationshipTypeIndex: Map<string, Set<string>> = new Map();
  private readonly sourceNodeIndex: Map<string, Set<string>> = new Map();
  private readonly targetNodeIndex: Map<string, Set<string>> = new Map();
  private readonly schema: GraphSchema = {
    labels: new Set(),
    relationshipTypes: new Set(),
    propertyIndexes: new Map(),
  };

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    await this.initializeDriver();
    this.logger.log('Knowledge Graph service initialized');
  }

  async onModuleDestroy(): Promise<void> {
    if (this.neo4jDriver) {
      try {
        await this.neo4jDriver.close();
      } catch {
        // Ignore
      }
    }
  }

  /**
   * Initialize Neo4j driver (graceful fallback to in-memory if unavailable).
   */
  private async initializeDriver(): Promise<void> {
    try {
      const neo4j = await import('neo4j-driver');
      const uri = this.configService.get<string>('NEO4J_URI', 'bolt://localhost:7687');
      const username = this.configService.get<string>('NEO4J_USERNAME', 'neo4j');
      const password = this.configService.get<string>('NEO4J_PASSWORD', 'password');

      this.neo4jDriver = neo4j.default.driver(uri, neo4j.default.auth.basic(username, password));

      // Verify connectivity
      const session = this.neo4jDriver.session();
      try {
        await session.run('RETURN 1');
        this.logger.log('Connected to Neo4j');
      } finally {
        await session.close();
      }
    } catch (error) {
      this.logger.warn(
        `Neo4j not available, using in-memory knowledge graph: ${(error as Error).message}`,
      );
      this.neo4jDriver = null;
    }
  }

  /**
   * Add a node to the knowledge graph.
   */
  async addNode(label: string, properties: Record<string, any>): Promise<KnowledgeNode> {
    const id = uuidv4();
    const now = new Date();

    const node: KnowledgeNode = {
      id,
      label,
      properties,
      createdAt: now,
      updatedAt: now,
    };

    if (this.neo4jDriver) {
      try {
        await this.executeNeo4jQuery(
          `CREATE (n:${this.sanitizeLabel(label)} {id: $id, properties: $properties, createdAt: datetime(), updatedAt: datetime()}) RETURN n`,
          { id, properties: JSON.stringify(properties) },
        );
      } catch (error) {
        this.logger.warn(`Neo4j write failed, using in-memory: ${(error as Error).message}`);
      }
    }

    // Always store in-memory as well for fast reads
    this.nodes.set(id, node);

    if (!this.labelIndex.has(label)) {
      this.labelIndex.set(label, new Set());
    }
    this.labelIndex.get(label)!.add(id);

    // Update schema
    this.schema.labels.add(label);
    if (properties) {
      for (const propKey of Object.keys(properties)) {
        if (!this.schema.propertyIndexes.has(label)) {
          this.schema.propertyIndexes.set(label, new Set());
        }
        this.schema.propertyIndexes.get(label)!.add(propKey);
      }
    }

    return node;
  }

  /**
   * Get a node by ID.
   */
  async getNode(id: string): Promise<KnowledgeNode | null> {
    const node = this.nodes.get(id);
    return node ? { ...node, properties: { ...node.properties } } : null;
  }

  /**
   * Update a node's properties.
   */
  async updateNode(id: string, properties: Record<string, any>): Promise<KnowledgeNode | null> {
    const node = this.nodes.get(id);
    if (!node) return null;

    node.properties = { ...node.properties, ...properties };
    node.updatedAt = new Date();

    if (this.neo4jDriver) {
      try {
        await this.executeNeo4jQuery(
          `MATCH (n {id: $id}) SET n.properties = $properties, n.updatedAt = datetime() RETURN n`,
          { id, properties: JSON.stringify(node.properties) },
        );
      } catch (error) {
        this.logger.warn(`Neo4j update failed: ${(error as Error).message}`);
      }
    }

    // Update schema
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

  /**
   * Delete a node by ID.
   */
  async deleteNode(id: string): Promise<boolean> {
    const node = this.nodes.get(id);
    if (!node) return false;

    // Remove from label index
    const labelSet = this.labelIndex.get(node.label);
    if (labelSet) {
      labelSet.delete(id);
      if (labelSet.size === 0) {
        this.labelIndex.delete(node.label);
      }
    }

    // Remove associated relationships and their indexes
    for (const [relId, rel] of this.relationships) {
      if (rel.sourceId === id || rel.targetId === id) {
        this.removeRelationshipIndexes(relId, rel);
        this.relationships.delete(relId);
      }
    }

    // Remove from source/target indexes
    this.sourceNodeIndex.delete(id);
    this.targetNodeIndex.delete(id);

    this.nodes.delete(id);

    if (this.neo4jDriver) {
      try {
        await this.executeNeo4jQuery(
          `MATCH (n {id: $id}) DETACH DELETE n`,
          { id },
        );
      } catch (error) {
        this.logger.warn(`Neo4j delete failed: ${(error as Error).message}`);
      }
    }

    return true;
  }

  /**
   * Add a relationship between two nodes.
   */
  async addRelationship(
    type: string,
    sourceId: string,
    targetId: string,
    properties?: Record<string, any>,
  ): Promise<KnowledgeRelationship> {
    // Verify nodes exist
    const sourceNode = this.nodes.get(sourceId);
    const targetNode = this.nodes.get(targetId);

    if (!sourceNode || !targetNode) {
      throw new Error(`Source node ${sourceId} or target node ${targetId} not found`);
    }

    const id = uuidv4();
    const now = new Date();

    const relationship: KnowledgeRelationship = {
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
    this.relationshipTypeIndex.get(type)!.add(id);

    // Update source/target indexes
    if (!this.sourceNodeIndex.has(sourceId)) {
      this.sourceNodeIndex.set(sourceId, new Set());
    }
    this.sourceNodeIndex.get(sourceId)!.add(id);

    if (!this.targetNodeIndex.has(targetId)) {
      this.targetNodeIndex.set(targetId, new Set());
    }
    this.targetNodeIndex.get(targetId)!.add(id);

    // Update schema
    this.schema.relationshipTypes.add(type);

    if (this.neo4jDriver) {
      try {
        await this.executeNeo4jQuery(
          `MATCH (s {id: $sourceId}), (t {id: $targetId}) CREATE (s)-[r:${this.sanitizeLabel(type)} {id: $id, properties: $properties, createdAt: datetime()}]->(t) RETURN r`,
          { sourceId, targetId, id, properties: JSON.stringify(properties || {}) },
        );
      } catch (error) {
        this.logger.warn(`Neo4j relationship create failed: ${(error as Error).message}`);
      }
    }

    return relationship;
  }

  /**
   * Get a relationship by ID.
   */
  async getRelationship(id: string): Promise<KnowledgeRelationship | null> {
    const rel = this.relationships.get(id);
    return rel ? { ...rel, properties: { ...rel.properties } } : null;
  }

  /**
   * Delete a relationship by ID.
   */
  async deleteRelationship(id: string): Promise<boolean> {
    const rel = this.relationships.get(id);
    if (!rel) return false;

    this.removeRelationshipIndexes(id, rel);
    this.relationships.delete(id);

    if (this.neo4jDriver) {
      try {
        await this.executeNeo4jQuery(
          `MATCH ()-[r {id: $id}]->() DELETE r`,
          { id },
        );
      } catch (error) {
        this.logger.warn(`Neo4j relationship delete failed: ${(error as Error).message}`);
      }
    }

    return true;
  }

  /**
   * Query the knowledge graph.
   */
  async query(query: KnowledgeGraphQuery): Promise<KnowledgeGraphResult> {
    let matchedNodeIds: Set<string> = new Set();

    // Filter by label
    if (query.nodeLabel) {
      const labelIds = this.labelIndex.get(query.nodeLabel);
      if (labelIds) {
        matchedNodeIds = new Set(labelIds);
      } else {
        return { nodes: [], relationships: [] };
      }
    } else {
      matchedNodeIds = new Set(this.nodes.keys());
    }

    // Filter by properties
    if (query.properties) {
      const filteredIds = new Set<string>();
      for (const nodeId of matchedNodeIds) {
        const node = this.nodes.get(nodeId);
        if (node && this.matchesProperties(node.properties, query.properties)) {
          filteredIds.add(nodeId);
        }
      }
      matchedNodeIds = filteredIds;
    }

    // Collect matching nodes
    const resultNodes: KnowledgeNode[] = [];
    for (const nodeId of matchedNodeIds) {
      const node = this.nodes.get(nodeId);
      if (node) {
        resultNodes.push({ ...node, properties: { ...node.properties } });
      }
    }

    // Collect matching relationships
    let matchedRelIds: Set<string> = new Set();

    if (query.relationshipType) {
      const typeIds = this.relationshipTypeIndex.get(query.relationshipType);
      if (typeIds) {
        matchedRelIds = new Set(typeIds);
      }
    } else {
      matchedRelIds = new Set(this.relationships.keys());
    }

    const resultRels: KnowledgeRelationship[] = [];
    for (const relId of matchedRelIds) {
      const rel = this.relationships.get(relId);
      if (
        rel &&
        (matchedNodeIds.has(rel.sourceId) || matchedNodeIds.has(rel.targetId))
      ) {
        resultRels.push({ ...rel, properties: { ...rel.properties } });
      }
    }

    // Apply limit
    const limit = query.limit || 100;
    return {
      nodes: resultNodes.slice(0, limit),
      relationships: resultRels.slice(0, limit),
    };
  }

  /**
   * Traverse the graph starting from a node.
   */
  async traverse(
    startNodeId: string,
    depth: number,
    relationshipType?: string,
  ): Promise<KnowledgeGraphResult> {
    const visitedNodes = new Set<string>();
    const visitedRels = new Set<string>();
    const resultNodes: KnowledgeNode[] = [];
    const resultRels: KnowledgeRelationship[] = [];

    const traverseNode = (nodeId: string, currentDepth: number): void => {
      if (currentDepth > depth || visitedNodes.has(nodeId)) return;

      visitedNodes.add(nodeId);
      const node = this.nodes.get(nodeId);
      if (node) {
        resultNodes.push({ ...node, properties: { ...node.properties } });
      }

      // Find relationships from this node (outgoing)
      const outgoingRels = this.sourceNodeIndex.get(nodeId);
      if (outgoingRels) {
        for (const relId of outgoingRels) {
          if (visitedRels.has(relId)) continue;

          const rel = this.relationships.get(relId);
          if (!rel) continue;

          const matchesType = !relationshipType || rel.type === relationshipType;

          if (matchesType) {
            visitedRels.add(relId);
            resultRels.push({ ...rel, properties: { ...rel.properties } });
            traverseNode(rel.targetId, currentDepth + 1);
          }
        }
      }

      // Also traverse incoming relationships
      const incomingRels = this.targetNodeIndex.get(nodeId);
      if (incomingRels) {
        for (const relId of incomingRels) {
          if (visitedRels.has(relId)) continue;

          const rel = this.relationships.get(relId);
          if (!rel) continue;

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

  // ─── Path Finding ──────────────────────────────────────────────────

  /**
   * Find the shortest path between two nodes using BFS.
   */
  async findPath(
    startNodeId: string,
    endNodeId: string,
    maxDepth: number = 10,
    relationshipType?: string,
  ): Promise<KnowledgeGraphResult> {
    const visited = new Set<string>();
    const parentMap = new Map<string, { nodeId: string; relId: string }>();
    const queue: string[] = [startNodeId];
    visited.add(startNodeId);

    let found = false;

    while (queue.length > 0 && !found) {
      const currentId = queue.shift()!;

      if (currentId === endNodeId) {
        found = true;
        break;
      }

      if (parentMap.size >= maxDepth * 10) break; // Safety limit

      // Explore outgoing relationships
      const outgoingRels = this.sourceNodeIndex.get(currentId);
      if (outgoingRels) {
        for (const relId of outgoingRels) {
          const rel = this.relationships.get(relId);
          if (!rel) continue;

          const matchesType = !relationshipType || rel.type === relationshipType;
          if (!matchesType) continue;

          if (!visited.has(rel.targetId)) {
            visited.add(rel.targetId);
            parentMap.set(rel.targetId, { nodeId: currentId, relId });
            queue.push(rel.targetId);
          }
        }
      }

      // Explore incoming relationships
      const incomingRels = this.targetNodeIndex.get(currentId);
      if (incomingRels) {
        for (const relId of incomingRels) {
          const rel = this.relationships.get(relId);
          if (!rel) continue;

          const matchesType = !relationshipType || rel.type === relationshipType;
          if (!matchesType) continue;

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

    // Reconstruct path
    const pathNodeIds: string[] = [endNodeId];
    const pathRelIds: string[] = [];
    let current = endNodeId;

    while (current !== startNodeId) {
      const parent = parentMap.get(current);
      if (!parent) break;
      pathNodeIds.unshift(parent.nodeId);
      pathRelIds.unshift(parent.relId);
      current = parent.nodeId;
    }

    const resultNodes: KnowledgeNode[] = [];
    for (const nodeId of pathNodeIds) {
      const node = this.nodes.get(nodeId);
      if (node) {
        resultNodes.push({ ...node, properties: { ...node.properties } });
      }
    }

    const resultRels: KnowledgeRelationship[] = [];
    for (const relId of pathRelIds) {
      const rel = this.relationships.get(relId);
      if (rel) {
        resultRels.push({ ...rel, properties: { ...rel.properties } });
      }
    }

    return { nodes: resultNodes, relationships: resultRels };
  }

  // ─── Schema Management ─────────────────────────────────────────────

  /**
   * Get the current graph schema.
   */
  getSchema(): {
    labels: string[];
    relationshipTypes: string[];
    propertyIndexes: Record<string, string[]>;
  } {
    const propertyIndexes: Record<string, string[]> = {};
    for (const [label, props] of this.schema.propertyIndexes) {
      propertyIndexes[label] = Array.from(props);
    }

    return {
      labels: Array.from(this.schema.labels),
      relationshipTypes: Array.from(this.schema.relationshipTypes),
      propertyIndexes,
    };
  }

  /**
   * Add a property index for a label.
   */
  addPropertyIndex(label: string, propertyName: string): void {
    if (!this.schema.propertyIndexes.has(label)) {
      this.schema.propertyIndexes.set(label, new Set());
    }
    this.schema.propertyIndexes.get(label)!.add(propertyName);
  }

  // ─── Cypher Query Support ──────────────────────────────────────────

  /**
   * Execute a raw Cypher query against Neo4j.
   * Falls back to limited in-memory query support.
   */
  async executeCypher(
    query: string,
    params?: Record<string, any>,
  ): Promise<any[]> {
    if (this.neo4jDriver) {
      try {
        const result = await this.executeNeo4jQuery(query, params || {});
        return result || [];
      } catch (error) {
        this.logger.warn(`Cypher query execution failed: ${(error as Error).message}`);
        return [];
      }
    }

    // In-memory fallback: support a limited subset of queries
    return this.executeInMemoryCypher(query, params || {});
  }

  /**
   * Get graph statistics.
   */
  getStats(): {
    totalNodes: number;
    totalRelationships: number;
    labels: number;
    relationshipTypes: number;
    connectedToNeo4j: boolean;
  } {
    return {
      totalNodes: this.nodes.size,
      totalRelationships: this.relationships.size,
      labels: this.labelIndex.size,
      relationshipTypes: this.relationshipTypeIndex.size,
      connectedToNeo4j: this.neo4jDriver !== null,
    };
  }

  // ─── Private Methods ─────────────────────────────────────────────

  private matchesProperties(
    nodeProps: Record<string, any>,
    queryProps: Record<string, any>,
  ): boolean {
    for (const [key, value] of Object.entries(queryProps)) {
      if (nodeProps[key] !== value) {
        return false;
      }
    }
    return true;
  }

  private sanitizeLabel(label: string): string {
    return label.replace(/[^a-zA-Z0-9_]/g, '_');
  }

  private removeRelationshipIndexes(relId: string, rel: KnowledgeRelationship): void {
    // Remove from type index
    const typeSet = this.relationshipTypeIndex.get(rel.type);
    if (typeSet) {
      typeSet.delete(relId);
      if (typeSet.size === 0) {
        this.relationshipTypeIndex.delete(rel.type);
      }
    }

    // Remove from source index
    const sourceSet = this.sourceNodeIndex.get(rel.sourceId);
    if (sourceSet) {
      sourceSet.delete(relId);
      if (sourceSet.size === 0) {
        this.sourceNodeIndex.delete(rel.sourceId);
      }
    }

    // Remove from target index
    const targetSet = this.targetNodeIndex.get(rel.targetId);
    if (targetSet) {
      targetSet.delete(relId);
      if (targetSet.size === 0) {
        this.targetNodeIndex.delete(rel.targetId);
      }
    }
  }

  private async executeNeo4jQuery(
    query: string,
    params: Record<string, any>,
  ): Promise<any> {
    if (!this.neo4jDriver) return null;

    const session = this.neo4jDriver.session();
    try {
      const result = await session.run(query, params);
      return result.records;
    } finally {
      await session.close();
    }
  }

  /**
   * Execute a very limited subset of Cypher queries in-memory.
   * Only supports MATCH/RETURN patterns for simple node lookups.
   */
  private executeInMemoryCypher(query: string, params: Record<string, any>): any[] {
    const normalizedQuery = query.trim().toLowerCase();

    // Support: MATCH (n:Label) RETURN n
    const matchLabelReturn = normalizedQuery.match(
      /match\s*\(\s*(\w+)\s*:\s*(\w+)\s*\)\s*return\s*\1/i,
    );

    if (matchLabelReturn) {
      const label = matchLabelReturn[2];
      const labelIds = this.labelIndex.get(label);
      if (!labelIds) return [];

      return Array.from(labelIds)
        .map((id) => this.nodes.get(id))
        .filter((n): n is KnowledgeNode => n !== undefined)
        .map((n) => ({ id: n.id, label: n.label, properties: n.properties }));
    }

    // Support: MATCH (n) RETURN n LIMIT x
    const matchAllReturn = normalizedQuery.match(
      /match\s*\(\s*(\w+)\s*\)\s*return\s*\1(?:\s+limit\s+(\d+))?/i,
    );

    if (matchAllReturn) {
      const limit = matchAllReturn[2] ? parseInt(matchAllReturn[2], 10) : 100;
      return Array.from(this.nodes.values())
        .slice(0, limit)
        .map((n) => ({ id: n.id, label: n.label, properties: n.properties }));
    }

    this.logger.warn('In-memory Cypher does not support this query pattern');
    return [];
  }
}
