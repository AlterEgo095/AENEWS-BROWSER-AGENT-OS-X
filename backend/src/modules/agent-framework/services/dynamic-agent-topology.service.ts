/**
 * AENEWS Agent OS X — Dynamic Agent Topology Service
 *
 * Phase 10 — Runtime reconfiguration of agent relationships and cluster membership.
 *
 * Topology Types:
 *   - Star (hub-spoke): One coordinator, all agents connect through it
 *   - Mesh (fully connected): Every agent can communicate with every other
 *   - Ring (circular): Agents form a circular communication chain
 *   - Tree (hierarchical): Multi-level hierarchy with parent-child relationships
 *   - Custom (user-defined graph): Arbitrary connection graph
 *
 * Operations:
 *   - Add/remove agents
 *   - Rewire connections
 *   - Change topology type
 *   - Isolate/restore agents
 *
 * Triggers:
 *   - Manual (admin API)
 *   - Adaptive (feedback from AdaptiveFeedbackLoopService)
 *   - Emergency (circuit breaker triggers isolation)
 *
 * Persistence:
 *   Topology state is persisted in Redis with PostgreSQL backup.
 */

import { Injectable, Logger } from '@nestjs/common';
import { AgentMemoryService, MemoryTier } from './agent-memory.service';
import {
  AgentEventBusService,
  AgentEventType,
} from './agent-event-bus.service';
import { AgentHealthService } from './agent-health.service';
import { ClusterType } from '../../agent/entities/agent.entity';

// ─── Topology Types ───────────────────────────────────────────────

export type TopologyType = 'star' | 'mesh' | 'ring' | 'tree' | 'custom';

export type TopologyChangeReason = 'manual' | 'adaptive' | 'emergency' | 'scheduled';

export interface TopologyNode {
  agentId: string;
  clusterType: ClusterType;
  status: 'active' | 'isolated' | 'failed';
  connections: string[];  // IDs of connected agents
  role: 'coordinator' | 'worker' | 'relay' | 'leaf';
  metadata?: Record<string, any>;
}

export interface TopologyEdge {
  from: string;
  to: string;
  weight: number;     // 0-1, communication preference
  latency: number;    // estimated latency in ms
  bandwidth: number;  // relative bandwidth capacity
  status: 'active' | 'degraded' | 'severed';
}

export interface TopologyConfig {
  id: string;
  type: TopologyType;
  nodes: Map<string, TopologyNode>;
  edges: TopologyEdge[];
  createdAt: number;
  updatedAt: number;
  changeHistory: TopologyChangeRecord[];
  metadata?: Record<string, any>;
}

export interface TopologyChangeRecord {
  timestamp: number;
  changeType: 'add_node' | 'remove_node' | 'add_edge' | 'remove_edge' | 'isolate' | 'restore' | 'retype' | 'rewire';
  reason: TopologyChangeReason;
  details: Record<string, any>;
  rolledBack: boolean;
}

export interface TopologyMetrics {
  totalNodes: number;
  activeNodes: number;
  isolatedNodes: number;
  totalEdges: number;
  activeEdges: number;
  averageConnectivity: number;
  clustering: number;   // 0-1, how clustered the graph is
  diameter: number;     // longest shortest path
  centralization: number; // 0-1, how central the hub is
}

// ─── Service ──────────────────────────────────────────────────────

@Injectable()
export class DynamicAgentTopologyService {
  private readonly logger = new Logger(DynamicAgentTopologyService.name);

  /** Active topologies by ID */
  private readonly topologies = new Map<string, TopologyConfig>();

  constructor(
    private readonly memoryService: AgentMemoryService,
    private readonly eventBus: AgentEventBusService,
    private readonly healthService: AgentHealthService,
  ) {}

  // ─── Topology Creation ────────────────────────────────────────

  /**
   * Create a new topology from a list of agents.
   */
  async createTopology(
    id: string,
    type: TopologyType,
    agentIds: string[],
    clusterTypes: ClusterType[],
    metadata?: Record<string, any>,
  ): Promise<TopologyConfig> {
    const nodes = new Map<string, TopologyNode>();

    // Create nodes
    for (let i = 0; i < agentIds.length; i++) {
      const role = this.assignTopologyRole(type, i, agentIds.length);
      nodes.set(agentIds[i], {
        agentId: agentIds[i],
        clusterType: clusterTypes[i] || ClusterType.META_INTELLIGENCE,
        status: 'active',
        connections: [],
        role,
      });
    }

    // Create edges based on topology type
    const edges = this.generateEdges(type, agentIds);

    // Update node connections from edges
    for (const edge of edges) {
      const fromNode = nodes.get(edge.from);
      if (fromNode && !fromNode.connections.includes(edge.to)) {
        fromNode.connections.push(edge.to);
      }
      const toNode = nodes.get(edge.to);
      if (toNode && !toNode.connections.includes(edge.from)) {
        toNode.connections.push(edge.from);
      }
    }

    const config: TopologyConfig = {
      id,
      type,
      nodes,
      edges,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      changeHistory: [],
      metadata,
    };

    this.topologies.set(id, config);

    this.logger.log(`Topology ${id} created: ${type} with ${agentIds.length} nodes, ${edges.length} edges`);

    await this.eventBus.publish({
      type: AgentEventType.CUSTOM,
      source: 'DynamicAgentTopologyService',
      data: { event: 'topology.created', topologyId: id, type, nodes: agentIds.length, edges: edges.length },
      timestamp: new Date(),
    });

    // Persist
    await this.persistTopology(id);

    return config;
  }

  /**
   * Generate edges based on topology type.
   */
  private generateEdges(type: TopologyType, agentIds: string[]): TopologyEdge[] {
    const edges: TopologyEdge[] = [];

    switch (type) {
      case 'star': {
        // Hub (first agent) connects to all others
        const hub = agentIds[0];
        for (let i = 1; i < agentIds.length; i++) {
          edges.push({
            from: hub,
            to: agentIds[i],
            weight: 1.0,
            latency: 10 + Math.random() * 20,
            bandwidth: 1.0,
            status: 'active',
          });
        }
        break;
      }

      case 'mesh': {
        // Every agent connects to every other
        for (let i = 0; i < agentIds.length; i++) {
          for (let j = i + 1; j < agentIds.length; j++) {
            edges.push({
              from: agentIds[i],
              to: agentIds[j],
              weight: 0.5 + Math.random() * 0.5,
              latency: 5 + Math.random() * 30,
              bandwidth: 0.5 + Math.random() * 0.5,
              status: 'active',
            });
          }
        }
        break;
      }

      case 'ring': {
        // Circular chain
        for (let i = 0; i < agentIds.length; i++) {
          const next = (i + 1) % agentIds.length;
          edges.push({
            from: agentIds[i],
            to: agentIds[next],
            weight: 1.0,
            latency: 10 + Math.random() * 10,
            bandwidth: 0.8,
            status: 'active',
          });
        }
        break;
      }

      case 'tree': {
        // Hierarchical — each parent has 2 children
        for (let i = 0; i < agentIds.length; i++) {
          const leftChild = 2 * i + 1;
          const rightChild = 2 * i + 2;
          if (leftChild < agentIds.length) {
            edges.push({
              from: agentIds[i],
              to: agentIds[leftChild],
              weight: 0.9,
              latency: 5 + Math.random() * 15,
              bandwidth: 0.7,
              status: 'active',
            });
          }
          if (rightChild < agentIds.length) {
            edges.push({
              from: agentIds[i],
              to: agentIds[rightChild],
              weight: 0.9,
              latency: 5 + Math.random() * 15,
              bandwidth: 0.7,
              status: 'active',
            });
          }
        }
        break;
      }

      case 'custom': {
        // No default edges — added manually
        break;
      }
    }

    return edges;
  }

  /**
   * Assign a role to a node based on topology type and position.
   */
  private assignTopologyRole(type: TopologyType, index: number, total: number): TopologyNode['role'] {
    switch (type) {
      case 'star':
        return index === 0 ? 'coordinator' : 'worker';
      case 'mesh':
        return 'worker';
      case 'ring':
        return 'relay';
      case 'tree':
        if (index === 0) return 'coordinator';
        if (2 * index + 1 < total) return 'relay';
        return 'leaf';
      case 'custom':
        return 'worker';
      default:
        return 'worker';
    }
  }

  // ─── Topology Operations ──────────────────────────────────────

  /**
   * Add a node to the topology.
   */
  async addNode(
    topologyId: string,
    agentId: string,
    clusterType: ClusterType,
    reason: TopologyChangeReason = 'manual',
  ): Promise<boolean> {
    const topology = this.topologies.get(topologyId);
    if (!topology) return false;

    if (topology.nodes.has(agentId)) {
      this.logger.warn(`Node ${agentId} already exists in topology ${topologyId}`);
      return false;
    }

    // Determine connections based on topology type
    const connections: string[] = [];
    const newEdges: TopologyEdge[] = [];

    switch (topology.type) {
      case 'star': {
        // Connect to the hub
        const hub = Array.from(topology.nodes.values()).find(n => n.role === 'coordinator');
        if (hub) {
          connections.push(hub.agentId);
          newEdges.push({
            from: hub.agentId,
            to: agentId,
            weight: 1.0,
            latency: 10 + Math.random() * 20,
            bandwidth: 1.0,
            status: 'active',
          });
        }
        break;
      }

      case 'mesh': {
        // Connect to all existing nodes
        for (const [existingId] of topology.nodes) {
          connections.push(existingId);
          newEdges.push({
            from: agentId,
            to: existingId,
            weight: 0.5 + Math.random() * 0.5,
            latency: 5 + Math.random() * 30,
            bandwidth: 0.5 + Math.random() * 0.5,
            status: 'active',
          });
        }
        break;
      }

      case 'ring': {
        // Insert between two adjacent nodes
        const existingIds = Array.from(topology.nodes.keys());
        if (existingIds.length >= 2) {
          const prev = existingIds[existingIds.length - 1];
          const next = existingIds[0];
          connections.push(prev, next);

          // Remove old edge between prev and next
          topology.edges = topology.edges.filter(e =>
            !((e.from === prev && e.to === next) || (e.from === next && e.to === prev)),
          );

          newEdges.push(
            { from: prev, to: agentId, weight: 1.0, latency: 10, bandwidth: 0.8, status: 'active' },
            { from: agentId, to: next, weight: 1.0, latency: 10, bandwidth: 0.8, status: 'active' },
          );
        } else if (existingIds.length === 1) {
          connections.push(existingIds[0]);
          newEdges.push(
            { from: agentId, to: existingIds[0], weight: 1.0, latency: 10, bandwidth: 0.8, status: 'active' },
            { from: existingIds[0], to: agentId, weight: 1.0, latency: 10, bandwidth: 0.8, status: 'active' },
          );
        }
        break;
      }

      case 'tree':
      case 'custom': {
        // Connect to the first leaf node as its child
        const leafNode = Array.from(topology.nodes.values()).find(n => n.role === 'leaf');
        if (leafNode) {
          connections.push(leafNode.agentId);
          leafNode.role = 'relay';
          newEdges.push({
            from: leafNode.agentId,
            to: agentId,
            weight: 0.9,
            latency: 10,
            bandwidth: 0.7,
            status: 'active',
          });
        }
        break;
      }
    }

    // Add node
    topology.nodes.set(agentId, {
      agentId,
      clusterType,
      status: 'active',
      connections,
      role: topology.type === 'star' ? 'worker' : topology.type === 'ring' ? 'relay' : 'leaf',
    });

    // Update connections on existing nodes
    for (const connectedId of connections) {
      const node = topology.nodes.get(connectedId);
      if (node && !node.connections.includes(agentId)) {
        node.connections.push(agentId);
      }
    }

    topology.edges.push(...newEdges);
    topology.updatedAt = Date.now();
    topology.changeHistory.push({
      timestamp: Date.now(),
      changeType: 'add_node',
      reason,
      details: { agentId, clusterType, connections },
      rolledBack: false,
    });

    this.logger.log(`Added node ${agentId} to topology ${topologyId}`);

    await this.persistTopology(topologyId);
    await this.publishTopologyEvent(topologyId, 'node.added', { agentId });

    return true;
  }

  /**
   * Remove a node from the topology.
   */
  async removeNode(
    topologyId: string,
    agentId: string,
    reason: TopologyChangeReason = 'manual',
  ): Promise<boolean> {
    const topology = this.topologies.get(topologyId);
    if (!topology) return false;

    if (!topology.nodes.has(agentId)) return false;

    // Remove edges involving this node
    topology.edges = topology.edges.filter(
      e => e.from !== agentId && e.to !== agentId,
    );

    // Remove from other nodes' connections
    for (const [, node] of topology.nodes) {
      node.connections = node.connections.filter(id => id !== agentId);
    }

    // Remove the node
    topology.nodes.delete(agentId);

    // If star topology and hub was removed, promote the first worker
    if (topology.type === 'star' && topology.nodes.size > 0) {
      const firstNode = Array.from(topology.nodes.values())[0];
      if (firstNode.role === 'worker') {
        firstNode.role = 'coordinator';
        // Reconnect all workers to new hub
        for (const [id, node] of topology.nodes) {
          if (id !== firstNode.agentId && !node.connections.includes(firstNode.agentId)) {
            node.connections.push(firstNode.agentId);
            firstNode.connections.push(id);
            topology.edges.push({
              from: firstNode.agentId,
              to: id,
              weight: 1.0,
              latency: 10,
              bandwidth: 1.0,
              status: 'active',
            });
          }
        }
      }
    }

    topology.updatedAt = Date.now();
    topology.changeHistory.push({
      timestamp: Date.now(),
      changeType: 'remove_node',
      reason,
      details: { agentId },
      rolledBack: false,
    });

    this.logger.log(`Removed node ${agentId} from topology ${topologyId}`);

    await this.persistTopology(topologyId);
    await this.publishTopologyEvent(topologyId, 'node.removed', { agentId });

    return true;
  }

  /**
   * Isolate an agent (sever all connections but keep in topology).
   */
  async isolateNode(
    topologyId: string,
    agentId: string,
    reason: TopologyChangeReason = 'emergency',
  ): Promise<boolean> {
    const topology = this.topologies.get(topologyId);
    if (!topology) return false;

    const node = topology.nodes.get(agentId);
    if (!node) return false;

    // Sever all edges
    for (const edge of topology.edges) {
      if (edge.from === agentId || edge.to === agentId) {
        edge.status = 'severed';
      }
    }

    // Remove from connections
    for (const [, otherNode] of topology.nodes) {
      if (otherNode.agentId !== agentId) {
        otherNode.connections = otherNode.connections.filter(id => id !== agentId);
      }
    }

    node.status = 'isolated';
    node.connections = [];

    topology.updatedAt = Date.now();
    topology.changeHistory.push({
      timestamp: Date.now(),
      changeType: 'isolate',
      reason,
      details: { agentId, previousConnections: node.connections },
      rolledBack: false,
    });

    this.logger.warn(`Isolated node ${agentId} in topology ${topologyId} (reason: ${reason})`);

    await this.persistTopology(topologyId);
    await this.publishTopologyEvent(topologyId, 'node.isolated', { agentId, reason });

    return true;
  }

  /**
   * Restore an isolated agent.
   */
  async restoreNode(topologyId: string, agentId: string): Promise<boolean> {
    const topology = this.topologies.get(topologyId);
    if (!topology) return false;

    const node = topology.nodes.get(agentId);
    if (!node || node.status !== 'isolated') return false;

    // Restore severed edges
    for (const edge of topology.edges) {
      if ((edge.from === agentId || edge.to === agentId) && edge.status === 'severed') {
        edge.status = 'active';
      }
    }

    // Rebuild connections from edges
    node.connections = [];
    for (const edge of topology.edges) {
      if (edge.from === agentId && edge.status === 'active') {
        node.connections.push(edge.to);
      } else if (edge.to === agentId && edge.status === 'active') {
        node.connections.push(edge.from);
      }
    }

    // Update other nodes
    for (const connectedId of node.connections) {
      const otherNode = topology.nodes.get(connectedId);
      if (otherNode && !otherNode.connections.includes(agentId)) {
        otherNode.connections.push(agentId);
      }
    }

    node.status = 'active';

    topology.updatedAt = Date.now();
    topology.changeHistory.push({
      timestamp: Date.now(),
      changeType: 'restore',
      reason: 'manual',
      details: { agentId, restoredConnections: node.connections },
      rolledBack: false,
    });

    this.logger.log(`Restored node ${agentId} in topology ${topologyId}`);

    await this.persistTopology(topologyId);
    await this.publishTopologyEvent(topologyId, 'node.restored', { agentId });

    return true;
  }

  /**
   * Change the topology type.
   */
  async retypeTopology(topologyId: string, newType: TopologyType): Promise<boolean> {
    const topology = this.topologies.get(topologyId);
    if (!topology) return false;

    const agentIds = Array.from(topology.nodes.keys());
    const clusterTypes = Array.from(topology.nodes.values()).map(n => n.clusterType);

    // Clear existing edges
    topology.edges = [];

    // Generate new edges
    topology.edges = this.generateEdges(newType, agentIds);

    // Update node connections and roles
    for (let i = 0; i < agentIds.length; i++) {
      const node = topology.nodes.get(agentIds[i])!;
      node.connections = [];
      node.role = this.assignTopologyRole(newType, i, agentIds.length);
    }

    // Update connections from edges
    for (const edge of topology.edges) {
      const fromNode = topology.nodes.get(edge.from);
      if (fromNode && !fromNode.connections.includes(edge.to)) {
        fromNode.connections.push(edge.to);
      }
      const toNode = topology.nodes.get(edge.to);
      if (toNode && !toNode.connections.includes(edge.from)) {
        toNode.connections.push(edge.from);
      }
    }

    const oldType = topology.type;
    topology.type = newType;
    topology.updatedAt = Date.now();
    topology.changeHistory.push({
      timestamp: Date.now(),
      changeType: 'retype',
      reason: 'manual',
      details: { oldType, newType },
      rolledBack: false,
    });

    this.logger.log(`Retyped topology ${topologyId}: ${oldType} → ${newType}`);

    await this.persistTopology(topologyId);
    await this.publishTopologyEvent(topologyId, 'topology.retyped', { oldType, newType });

    return true;
  }

  // ─── Metrics ──────────────────────────────────────────────────

  /**
   * Calculate topology metrics.
   */
  getMetrics(topologyId: string): TopologyMetrics | undefined {
    const topology = this.topologies.get(topologyId);
    if (!topology) return undefined;

    const nodes = Array.from(topology.nodes.values());
    const activeEdges = topology.edges.filter(e => e.status === 'active');
    const activeNodes = nodes.filter(n => n.status === 'active');
    const isolatedNodes = nodes.filter(n => n.status === 'isolated');

    // Average connectivity
    const totalConnections = activeNodes.reduce((sum, n) => sum + n.connections.length, 0);
    const averageConnectivity = activeNodes.length > 0 ? totalConnections / activeNodes.length : 0;

    // Clustering coefficient (simplified)
    let triangles = 0;
    let triplets = 0;
    for (const node of activeNodes) {
      const neighbors = node.connections;
      for (let i = 0; i < neighbors.length; i++) {
        for (let j = i + 1; j < neighbors.length; j++) {
          triplets++;
          const neighborI = topology.nodes.get(neighbors[i]);
          if (neighborI?.connections.includes(neighbors[j])) {
            triangles++;
          }
        }
      }
    }
    const clustering = triplets > 0 ? triangles / triplets : 0;

    // Diameter (BFS from each node — simplified)
    const diameter = this.calculateDiameter(topology);

    // Centralization
    const maxDegree = Math.max(...activeNodes.map(n => n.connections.length), 0);
    const centralization = activeNodes.length > 1
      ? (maxDegree * 2 - totalConnections) / ((activeNodes.length - 1) * (activeNodes.length - 2) || 1)
      : 0;

    return {
      totalNodes: nodes.length,
      activeNodes: activeNodes.length,
      isolatedNodes: isolatedNodes.length,
      totalEdges: topology.edges.length,
      activeEdges: activeEdges.length,
      averageConnectivity,
      clustering,
      diameter,
      centralization: Math.max(0, Math.min(1, centralization)),
    };
  }

  /**
   * Calculate graph diameter using BFS.
   */
  private calculateDiameter(topology: TopologyConfig): number {
    const activeIds = Array.from(topology.nodes.values())
      .filter(n => n.status === 'active')
      .map(n => n.agentId);

    if (activeIds.length <= 1) return 0;

    let maxDistance = 0;

    for (const startId of activeIds) {
      const distances = new Map<string, number>();
      const queue = [startId];
      distances.set(startId, 0);

      while (queue.length > 0) {
        const current = queue.shift()!;
        const currentDist = distances.get(current) || 0;

        const node = topology.nodes.get(current);
        if (!node) continue;

        for (const neighbor of node.connections) {
          if (!distances.has(neighbor) && topology.nodes.get(neighbor)?.status === 'active') {
            distances.set(neighbor, currentDist + 1);
            queue.push(neighbor);
            maxDistance = Math.max(maxDistance, currentDist + 1);
          }
        }
      }
    }

    return maxDistance;
  }

  // ─── Persistence ──────────────────────────────────────────────

  /**
   * Persist topology state to memory.
   */
  private async persistTopology(topologyId: string): Promise<void> {
    const topology = this.topologies.get(topologyId);
    if (!topology) return;

    try {
      // Convert Map to serializable format
      const serializable = {
        ...topology,
        nodes: Object.fromEntries(topology.nodes),
      };

      await this.memoryService.store(
        `topology:${topologyId}`,
        JSON.stringify(serializable),
        MemoryTier.SHORT_TERM,
        3600,
      );
    } catch (error) {
      this.logger.warn(`Failed to persist topology ${topologyId}: ${error.message}`);
    }
  }

  /**
   * Publish a topology event.
   */
  private async publishTopologyEvent(topologyId: string, event: string, data: Record<string, any>): Promise<void> {
    await this.eventBus.publish({
      type: AgentEventType.CUSTOM,
      source: 'DynamicAgentTopologyService',
      data: { event, topologyId, ...data },
      timestamp: new Date(),
    });
  }

  // ─── Query Methods ────────────────────────────────────────────

  getTopology(topologyId: string): TopologyConfig | undefined {
    return this.topologies.get(topologyId);
  }

  getAllTopologies(): { id: string; type: TopologyType; nodes: number; edges: number }[] {
    return Array.from(this.topologies.values()).map(t => ({
      id: t.id,
      type: t.type,
      nodes: t.nodes.size,
      edges: t.edges.length,
    }));
  }

  getChangeHistory(topologyId: string, limit: number = 50): TopologyChangeRecord[] {
    const topology = this.topologies.get(topologyId);
    if (!topology) return [];
    return topology.changeHistory.slice(-limit);
  }
}
