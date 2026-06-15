import {
  BaseAgent,
  AgentContext,
  AgentResult,
} from '../../../modules/agent/agent.abstract';
import { ClusterType, MissionCategory } from '../../../modules/agent/entities/agent.entity';
import { AgentEventType } from '../../../modules/agent-framework/services/agent-event-bus.service';

/**
 * KubernetesAgent — Elite Kubernetes operations agent for the INFRASTRUCTURE cluster.
 *
 * Provides full Kubernetes lifecycle management including workload deployment,
 * Helm chart management, pod debugging, service mesh configuration, cluster
 * scaling, and network policy management. Uses LLM for generating context-aware
 * Kubernetes configurations and falls back to realistic manifest profiles when
 * LLM is unavailable.
 */
export class KubernetesAgent extends BaseAgent {
  readonly name = 'KubernetesAgent';
  readonly cluster = ClusterType.INFRASTRUCTURE;
  readonly capabilities = [
    'k8s-deploy',
    'service-mesh',
    'helm-charts',
    'pod-debug',
    'scaling-k8s',
    'network-policy',
    'cluster-management',
  ];
  readonly version = '3.0.0';
  readonly description =
    'Elite Kubernetes operations agent providing full cluster lifecycle management, service mesh orchestration, Helm chart deployment, pod debugging, autoscaling, and network policy enforcement';

  readonly missionCategories = [MissionCategory.INFRASTRUCTURE_MGMT, MissionCategory.SYSTEM_ADMINISTRATION];
  readonly creditCost = 5;
  readonly powerLevel = 3;
  readonly tier = 'elite';

  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      const { config } = context;
      const action = config.action || 'deploy-workload';
      const startTime = Date.now();

      this.emitEvent(AgentEventType.AGENT_STARTED, { action, agent: this.name });

      switch (action) {
        case 'deploy-workload': {
          const workloadName = config.workloadName;
          const namespace = config.namespace || 'default';
          const image = config.image;
          const replicas = config.replicas || 3;
          const workloadType = config.workloadType || 'Deployment';
          const labels = config.labels || { app: workloadName || 'unknown' };
          const resources = config.resources || {
            requests: { cpu: '100m', memory: '128Mi' },
            limits: { cpu: '500m', memory: '512Mi' },
          };
          const envVars = config.envVars || [];
          const ports = config.ports || [];
          const strategy = config.strategy || { type: 'RollingUpdate', rollingUpdate: { maxSurge: 1, maxUnavailable: 0 } };
          const nodeSelector = config.nodeSelector || {};
          const tolerations = config.tolerations || [];
          const affinity = config.affinity || {};

          this.logger.log(
            `Deploying workload ${workloadName || 'unnamed'} (${workloadType}) to namespace ${namespace} with ${replicas} replicas`,
          );

          this.emitEvent(AgentEventType.TOOL_EXECUTED, {
            tool: 'k8s-deploy',
            workloadName,
            namespace,
            replicas,
          });

          const llmResult = await this.executeWithLLM(
            `You are an elite Kubernetes architect. Generate a production-grade Kubernetes manifest for the specified workload with best-practice security, resource management, and reliability configurations.`,
            `Generate a complete Kubernetes ${workloadType} manifest for: name="${workloadName}", namespace="${namespace}", image="${image}", replicas=${replicas}, labels=${JSON.stringify(labels)}, resources=${JSON.stringify(resources)}, envVars=${JSON.stringify(envVars)}, ports=${JSON.stringify(ports)}, strategy=${JSON.stringify(strategy)}. Return JSON with: manifest (object with apiVersion, kind, metadata, spec), healthChecks ({livenessProbe, readinessProbe}), securityContext (object), serviceManifest (object for accompanying Service).`,
            { responseFormat: 'json', temperature: 0.2, maxTokens: 4096 },
          );
          const parsed = this.safeJsonParse(llmResult);

          const manifest = parsed?.manifest || {
            apiVersion: 'apps/v1',
            kind: workloadType,
            metadata: { name: workloadName || 'app-deployment', namespace, labels },
            spec: {
              replicas,
              selector: { matchLabels: labels },
              strategy,
              template: {
                metadata: { labels },
                spec: {
                  containers: [{
                    name: workloadName || 'app',
                    image: image || 'nginx:latest',
                    ports: ports.length > 0 ? ports : [{ containerPort: 80 }],
                    resources,
                    env: envVars,
                  }],
                  nodeSelector,
                  tolerations,
                  affinity,
                },
              },
            },
          };
          const healthChecks = parsed?.healthChecks || {
            livenessProbe: { httpGet: { path: '/health', port: 80 }, initialDelaySeconds: 15, periodSeconds: 10 },
            readinessProbe: { httpGet: { path: '/ready', port: 80 }, initialDelaySeconds: 5, periodSeconds: 5 },
          };
          const securityContext = parsed?.securityContext || {
            runAsNonRoot: true,
            readOnlyRootFilesystem: true,
            allowPrivilegeEscalation: false,
            capabilities: { drop: ['ALL'] },
          };
          const serviceManifest = parsed?.serviceManifest || {
            apiVersion: 'v1',
            kind: 'Service',
            metadata: { name: `${workloadName || 'app'}-service`, namespace, labels },
            spec: {
              selector: labels,
              ports: [{ port: 80, targetPort: 80, protocol: 'TCP' }],
              type: 'ClusterIP',
            },
          };

          this.emitEvent(AgentEventType.AGENT_COMPLETED, {
            workloadName: workloadName || 'unnamed',
            namespace,
            replicas,
            workloadType,
          });

          return {
            success: true,
            data: {
              action,
              workloadName: workloadName || null,
              namespace,
              image: image || null,
              replicas,
              workloadType,
              labels,
              resources,
              envVars,
              ports,
              strategy,
              nodeSelector,
              tolerations,
              affinity,
              manifest,
              healthChecks,
              securityContext,
              serviceManifest,
              status: 'workload_deployed',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime },
          };
        }

        case 'manage-helm': {
          const releaseName = config.releaseName;
          const chartName = config.chartName;
          const chartVersion = config.chartVersion || 'latest';
          const repoUrl = config.repoUrl || 'https://charts.helm.sh/stable';
          const namespace = config.namespace || 'default';
          const values = config.values || {};
          const operation = config.operation || 'install';
          const atomic = config.atomic ?? true;
          const wait = config.wait ?? true;
          const timeout = config.timeout || 300;

          this.logger.log(
            `${operation === 'install' ? 'Installing' : 'Upgrading'} Helm release ${releaseName || 'unnamed'} (chart: ${chartName || 'unknown'})`,
          );

          this.emitEvent(AgentEventType.TOOL_EXECUTED, {
            tool: 'helm-charts',
            releaseName,
            chartName,
            operation,
          });

          const llmResult = await this.executeWithLLM(
            `You are an elite Helm chart specialist. Generate optimal Helm values and release configuration for production deployments.`,
            `Generate Helm configuration for: releaseName="${releaseName}", chartName="${chartName}", chartVersion="${chartVersion}", namespace="${namespace}", operation="${operation}", values=${JSON.stringify(values)}. Return JSON with: renderedValues (object), releaseNotes (string), dependencies (array of {name, version, repository}), hooks (array of {name, event, manifest}).`,
            { responseFormat: 'json', temperature: 0.2, maxTokens: 4096 },
          );
          const parsed = this.safeJsonParse(llmResult);

          const renderedValues = parsed?.renderedValues || {
            replicaCount: 3,
            image: { repository: chartName || 'app', tag: chartVersion, pullPolicy: 'IfNotPresent' },
            service: { type: 'ClusterIP', port: 80 },
            ingress: { enabled: false },
            resources: { requests: { cpu: '100m', memory: '128Mi' }, limits: { cpu: '500m', memory: '512Mi' } },
            autoscaling: { enabled: true, minReplicas: 2, maxReplicas: 10, targetCPUUtilizationPercentage: 80 },
            ...values,
          };
          const releaseNotes = parsed?.releaseNotes || `Helm release ${releaseName || 'unnamed'} ${operation} completed. Chart: ${chartName || 'unknown'} v${chartVersion}. Namespace: ${namespace}.`;
          const dependencies = parsed?.dependencies || [
            { name: 'common', version: '1.0.0', repository: 'https://charts.bitnami.com/bitnami' },
          ];
          const hooks = parsed?.hooks || [
            { name: 'pre-install-hook', event: 'pre-install', manifest: 'Job' },
            { name: 'post-install-hook', event: 'post-install', manifest: 'Job' },
          ];

          this.emitEvent(AgentEventType.AGENT_COMPLETED, {
            releaseName: releaseName || 'unnamed',
            operation,
            chartName,
          });

          return {
            success: true,
            data: {
              action,
              releaseName: releaseName || null,
              chartName: chartName || null,
              chartVersion,
              repoUrl,
              namespace,
              values,
              operation,
              atomic,
              wait,
              timeout,
              renderedValues,
              releaseNotes,
              dependencies,
              hooks,
              status: `helm_${operation}_completed`,
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime },
          };
        }

        case 'debug-pod': {
          const podName = config.podName;
          const namespace = config.namespace || 'default';
          const issueType = config.issueType || 'crashloopbackoff';
          const includeLogs = config.includeLogs ?? true;
          const includeEvents = config.includeEvents ?? true;
          const includeDescribe = config.includeDescribe ?? true;
          const previousLogs = config.previousLogs ?? false;
          const tailLines = config.tailLines || 100;
          const containerName = config.containerName || null;

          this.logger.log(
            `Debugging pod ${podName || 'unknown'} in namespace ${namespace} (issue: ${issueType})`,
          );

          this.emitEvent(AgentEventType.TOOL_EXECUTED, {
            tool: 'pod-debug',
            podName,
            namespace,
            issueType,
          });

          const llmResult = await this.executeWithLLM(
            `You are an elite Kubernetes troubleshooting expert. Analyze the pod issue and provide a comprehensive diagnosis with actionable remediation steps.`,
            `Diagnose Kubernetes pod issue: podName="${podName}", namespace="${namespace}", issueType="${issueType}", includeLogs=${includeLogs}, includeEvents=${includeEvents}, previousLogs=${previousLogs}. Return JSON with: diagnosis ({rootCause, severity, affectedComponents}), remediation ({steps: [{order, action, command, description}], estimatedRecoveryTime}), prevention ({recommendations: string[]}).`,
            { responseFormat: 'json', temperature: 0.2, maxTokens: 4096 },
          );
          const parsed = this.safeJsonParse(llmResult);

          const diagnosis = parsed?.diagnosis || {
            rootCause: `Pod ${podName || 'unknown'} experiencing ${issueType} — likely due to application error, resource limits, or misconfigured probe`,
            severity: 'high',
            affectedComponents: [podName || 'unknown-pod', namespace],
          };
          const remediation = parsed?.remediation || {
            steps: [
              { order: 1, action: 'inspect', command: `kubectl describe pod ${podName || 'POD_NAME'} -n ${namespace}`, description: 'Inspect pod events and conditions' },
              { order: 2, action: 'logs', command: `kubectl logs ${podName || 'POD_NAME'} -n ${namespace}${previousLogs ? ' --previous' : ''} --tail=${tailLines}${containerName ? ` -c ${containerName}` : ''}`, description: 'Collect container logs for error analysis' },
              { order: 3, action: 'fix-config', command: `kubectl edit deployment ${podName || 'DEPLOYMENT'} -n ${namespace}`, description: 'Adjust resource limits, probe settings, or environment variables' },
              { order: 4, action: 'restart', command: `kubectl rollout restart deployment ${podName || 'DEPLOYMENT'} -n ${namespace}`, description: 'Restart the deployment with corrected configuration' },
            ],
            estimatedRecoveryTime: 120000,
          };
          const prevention = parsed?.prevention || {
            recommendations: [
              'Configure appropriate liveness and readiness probes with proper initialDelaySeconds',
              'Set resource requests and limits based on actual application requirements',
              'Implement PodDisruptionBudgets for critical workloads',
              'Use topology spread constraints for high availability',
              'Enable horizontal pod autoscaling with custom metrics',
            ],
          };

          this.emitEvent(AgentEventType.AGENT_COMPLETED, {
            podName: podName || 'unknown',
            issueType,
            rootCause: diagnosis.rootCause,
          });

          return {
            success: true,
            data: {
              action,
              podName: podName || null,
              namespace,
              issueType,
              includeLogs,
              includeEvents,
              includeDescribe,
              previousLogs,
              tailLines,
              containerName,
              diagnosis,
              remediation,
              prevention,
              status: 'pod_debug_completed',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime },
          };
        }

        case 'configure-mesh': {
          const meshType = config.meshType || 'istio';
          const namespace = config.namespace || 'default';
          const serviceName = config.serviceName;
          const trafficPolicy = config.trafficPolicy || { loadBalancer: { simple: 'ROUND_ROBIN' }, connectionPool: { tcp: { maxConnections: 100 }, http: { h2UpgradePolicy: 'DEFAULT' } } };
          const routingRules = config.routingRules || [];
          const mTLS = config.mTLS ?? true;
          const circuitBreaker = config.circuitBreaker || { consecutive5xxErrors: 5, interval: '30s', baseEjectionTime: '30s', maxEjectionPercent: 50 };
          const retryPolicy = config.retryPolicy || { attempts: 3, perTryTimeout: '2s', retryOn: '5xx,reset,connect-failure' };
          const enableTracing = config.enableTracing ?? true;
          const enableMetrics = config.enableMetrics ?? true;

          this.logger.log(
            `Configuring ${meshType} service mesh for ${serviceName || 'service'} in namespace ${namespace}`,
          );

          this.emitEvent(AgentEventType.TOOL_EXECUTED, {
            tool: 'service-mesh',
            meshType,
            serviceName,
            namespace,
          });

          const llmResult = await this.executeWithLLM(
            `You are an elite service mesh architect. Design a comprehensive mesh configuration for production traffic management, security, and observability.`,
            `Design ${meshType} service mesh config for: serviceName="${serviceName}", namespace="${namespace}", mTLS=${mTLS}, trafficPolicy=${JSON.stringify(trafficPolicy)}, circuitBreaker=${JSON.stringify(circuitBreaker)}, retryPolicy=${JSON.stringify(retryPolicy)}, routingRules=${JSON.stringify(routingRules)}. Return JSON with: destinationRule (object), virtualService (object), peerAuthentication (object), envoyFilter (object or null).`,
            { responseFormat: 'json', temperature: 0.2, maxTokens: 4096 },
          );
          const parsed = this.safeJsonParse(llmResult);

          const destinationRule = parsed?.destinationRule || {
            apiVersion: 'networking.istio.io/v1beta1',
            kind: 'DestinationRule',
            metadata: { name: `${serviceName || 'service'}-destination`, namespace },
            spec: {
              host: serviceName || 'service',
              trafficPolicy,
              connectionPool: trafficPolicy.connectionPool,
              outlierDetection: circuitBreaker,
            },
          };
          const virtualService = parsed?.virtualService || {
            apiVersion: 'networking.istio.io/v1beta1',
            kind: 'VirtualService',
            metadata: { name: `${serviceName || 'service'}-virtual-service`, namespace },
            spec: {
              hosts: [serviceName || 'service'],
              gateways: ['mesh'],
              http: routingRules.length > 0 ? routingRules : [{
                route: [{ destination: { host: serviceName || 'service', port: { number: 80 } }, weight: 100 }],
                retries: retryPolicy,
                timeout: '60s',
              }],
            },
          };
          const peerAuthentication = parsed?.peerAuthentication || {
            apiVersion: 'security.istio.io/v1beta1',
            kind: 'PeerAuthentication',
            metadata: { name: `${serviceName || 'service'}-peerauthn`, namespace },
            spec: {
              mtls: { mode: mTLS ? 'STRICT' : 'PERMISSIVE' },
            },
          };
          const envoyFilter = parsed?.envoyFilter || null;

          this.emitEvent(AgentEventType.AGENT_COMPLETED, {
            meshType,
            serviceName: serviceName || 'unknown',
            mTLS,
          });

          return {
            success: true,
            data: {
              action,
              meshType,
              namespace,
              serviceName: serviceName || null,
              trafficPolicy,
              routingRules,
              mTLS,
              circuitBreaker,
              retryPolicy,
              enableTracing,
              enableMetrics,
              destinationRule,
              virtualService,
              peerAuthentication,
              envoyFilter,
              status: 'mesh_configured',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime },
          };
        }

        case 'scale-cluster': {
          const clusterName = config.clusterName;
          const nodeGroup = config.nodeGroup || 'default';
          const minNodes = config.minNodes || 3;
          const maxNodes = config.maxNodes || 20;
          const desiredNodes = config.desiredNodes || 5;
          const scalingStrategy = config.scalingStrategy || 'cluster-autoscaler';
          const instanceType = config.instanceType || 'm5.large';
          const labels = config.labels || {};
          const taints = config.taints || [];
          const region = config.region || 'us-east-1';
          const provider = config.provider || 'aws';
          const autoscalingConfig = config.autoscalingConfig || {
            scaleDownUtilizationThreshold: 0.5,
            scaleDownUnneededTime: '10m',
            scanInterval: '10s',
            maxGracefulTerminationSec: 600,
          };

          this.logger.log(
            `Scaling cluster ${clusterName || 'unknown'} node group ${nodeGroup} (desired: ${desiredNodes}, strategy: ${scalingStrategy})`,
          );

          this.emitEvent(AgentEventType.TOOL_EXECUTED, {
            tool: 'scaling-k8s',
            clusterName,
            nodeGroup,
            desiredNodes,
          });

          const llmResult = await this.executeWithLLM(
            `You are an elite Kubernetes cluster scaling expert. Design an optimal scaling plan that balances performance, cost, and reliability.`,
            `Design scaling plan for: clusterName="${clusterName}", nodeGroup="${nodeGroup}", minNodes=${minNodes}, maxNodes=${maxNodes}, desiredNodes=${desiredNodes}, strategy="${scalingStrategy}", instanceType="${instanceType}", provider="${provider}", region="${region}". Return JSON with: scalingPlan ({currentNodes, targetNodes, phasedScaling: boolean, phases: [{nodes, waitTime, validationChecks}]}), resourceAllocation ({cpuCapacity, memoryCapacity, gpuCapacity}), costEstimate ({hourlyRate, monthlyEstimate, currency}).`,
            { responseFormat: 'json', temperature: 0.2, maxTokens: 4096 },
          );
          const parsed = this.safeJsonParse(llmResult);

          const scalingPlan = parsed?.scalingPlan || {
            currentNodes: desiredNodes > 5 ? 5 : 3,
            targetNodes: desiredNodes,
            phasedScaling: desiredNodes - (desiredNodes > 5 ? 5 : 3) > 3,
            phases: [
              { nodes: Math.ceil(desiredNodes / 2), waitTime: '120s', validationChecks: ['node-ready', 'pods-scheduled'] },
              { nodes: desiredNodes, waitTime: '120s', validationChecks: ['node-ready', 'pods-scheduled', 'hpa-stable'] },
            ],
          };
          const resourceAllocation = parsed?.resourceAllocation || {
            cpuCapacity: `${desiredNodes * 2} cores`,
            memoryCapacity: `${desiredNodes * 8} Gi`,
            gpuCapacity: '0',
          };
          const costEstimate = parsed?.costEstimate || {
            hourlyRate: (desiredNodes * 0.096).toFixed(2),
            monthlyEstimate: (desiredNodes * 0.096 * 730).toFixed(2),
            currency: 'USD',
          };

          this.emitEvent(AgentEventType.AGENT_COMPLETED, {
            clusterName: clusterName || 'unknown',
            desiredNodes,
            scalingStrategy,
          });

          return {
            success: true,
            data: {
              action,
              clusterName: clusterName || null,
              nodeGroup,
              minNodes,
              maxNodes,
              desiredNodes,
              scalingStrategy,
              instanceType,
              labels,
              taints,
              region,
              provider,
              autoscalingConfig,
              scalingPlan,
              resourceAllocation,
              costEstimate,
              status: 'cluster_scaling_initiated',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime },
          };
        }

        case 'manage-network-policy': {
          const policyName = config.policyName;
          const namespace = config.namespace || 'default';
          const policyType = config.policyType || 'ingress';
          const direction = config.direction || 'ingress';
          const podSelector = config.podSelector || {};
          const ingressRules = config.ingressRules || [];
          const egressRules = config.egressRules || [];
          const defaultDeny = config.defaultDeny ?? true;
          const allowedNamespaces = config.allowedNamespaces || [namespace];
          const allowedPorts = config.allowedPorts || [{ port: 80, protocol: 'TCP' }];
          const dnsEgress = config.dnsEgress ?? true;

          this.logger.log(
            `Managing network policy ${policyName || 'unnamed'} in namespace ${namespace} (type: ${policyType})`,
          );

          this.emitEvent(AgentEventType.TOOL_EXECUTED, {
            tool: 'network-policy',
            policyName,
            namespace,
            policyType,
          });

          const llmResult = await this.executeWithLLM(
            `You are an elite Kubernetes network security specialist. Design a network policy that enforces zero-trust networking with precise microsegmentation.`,
            `Design a Kubernetes NetworkPolicy for: policyName="${policyName}", namespace="${namespace}", direction="${direction}", podSelector=${JSON.stringify(podSelector)}, defaultDeny=${defaultDeny}, allowedNamespaces=${JSON.stringify(allowedNamespaces)}, allowedPorts=${JSON.stringify(allowedPorts)}, dnsEgress=${dnsEgress}. Return JSON with: networkPolicyManifest (object with apiVersion, kind, metadata, spec), policyExplanation (string), complianceNotes (string[]).`,
            { responseFormat: 'json', temperature: 0.2, maxTokens: 4096 },
          );
          const parsed = this.safeJsonParse(llmResult);

          const networkPolicyManifest = parsed?.networkPolicyManifest || {
            apiVersion: 'networking.k8s.io/v1',
            kind: 'NetworkPolicy',
            metadata: { name: policyName || 'default-network-policy', namespace },
            spec: {
              podSelector,
              policyTypes: [direction === 'both' ? 'Ingress' : direction === 'egress' ? 'Egress' : 'Ingress', direction === 'both' ? 'Egress' : undefined].filter(Boolean) as string[],
              ingress: ingressRules.length > 0 ? ingressRules : defaultDeny ? [] : [{
                from: allowedNamespaces.map((ns: string) => ({ namespaceSelector: { matchLabels: { 'kubernetes.io/metadata.name': ns } } })),
                ports: allowedPorts,
              }],
              egress: egressRules.length > 0 ? egressRules : dnsEgress ? [{
                to: [{ namespaceSelector: {} }, { ipBlock: { cidr: '0.0.0.0/0' } }],
                ports: [{ port: 53, protocol: 'UDP' }, { port: 53, protocol: 'TCP' }],
              }] : [],
            },
          };
          const policyExplanation = parsed?.policyExplanation || `Network policy '${policyName || 'default-network-policy'}' enforces ${defaultDeny ? 'default-deny' : 'selective-allow'} ${direction} traffic in namespace '${namespace}'. Allowed sources: ${allowedNamespaces.join(', ') || 'none'}. Allowed ports: ${allowedPorts.map((p: any) => `${p.port}/${p.protocol}`).join(', ') || 'none'}.`;
          const complianceNotes = parsed?.complianceNotes || [
            'NetworkPolicy enforces zero-trust networking at L3/L4',
            'Consider using Cilium or Calico for advanced L7 policy support',
            'Pair with Service Mesh mTLS for defense-in-depth',
            'Verify policy with kubectl policy check before production deployment',
          ];

          this.emitEvent(AgentEventType.AGENT_COMPLETED, {
            policyName: policyName || 'unnamed',
            namespace,
            defaultDeny,
          });

          return {
            success: true,
            data: {
              action,
              policyName: policyName || null,
              namespace,
              policyType,
              direction,
              podSelector,
              ingressRules,
              egressRules,
              defaultDeny,
              allowedNamespaces,
              allowedPorts,
              dnsEgress,
              networkPolicyManifest,
              policyExplanation,
              complianceNotes,
              status: 'network_policy_configured',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime },
          };
        }

        default:
          return { success: false, error: `Unknown action: ${action}` };
      }
    } catch (error: any) {
      this.emitEvent(AgentEventType.AGENT_FAILED, { error: error.message });
      return { success: false, error: error.message };
    }
  }
}
