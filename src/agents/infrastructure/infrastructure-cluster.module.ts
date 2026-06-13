/**
 * AENEWS Agent OS X - Infrastructure Cluster Module
 * Aggregates all 8 infrastructure agents into a single NestJS module.
 * Imports the BaseAgentModule for shared infrastructure (event bus, memory).
 * Provides all infrastructure agent services for dependency injection.
 */

import { Module } from '@nestjs/common';
import { BaseAgentModule } from '../base/base-agent.module';
import { AgentConnectorBridgeModule } from '../bridge';
import { DeploymentAgentService } from './deployment/deployment-agent.service';
import { MonitoringAgentService } from './monitoring/monitoring-agent.service';
import { LoggingAgentService } from './logging/logging-agent.service';
import { BackupAgentService } from './backup/backup-agent.service';
import { ScalingAgentService } from './scaling/scaling-agent.service';
import { NetworkAgentService } from './network/network-agent.service';
import { ContainerAgentService } from './container/container-agent.service';
import { ConfigurationAgentService } from './configuration/configuration-agent.service';

@Module({
  imports: [BaseAgentModule, AgentConnectorBridgeModule],
  providers: [
    // 1. Deployment — deploy, rollback, blue-green, canary, smoke-test, promote
    DeploymentAgentService,
    // 2. Monitoring — collectMetrics, checkHealth, setAlert, createDashboard, analyzePerformance, generateReport
    MonitoringAgentService,
    // 3. Logging — collectLogs, searchLogs, analyzePatterns, setLogLevel, exportLogs, createLogAlert
    LoggingAgentService,
    // 4. Backup — createBackup, restoreBackup, scheduleBackup, verifyBackup, listBackups, deleteBackup
    BackupAgentService,
    // 5. Scaling — scaleUp, scaleDown, autoScale, getResourceUsage, predictCapacity, setScalingPolicy
    ScalingAgentService,
    // 6. Network — configureDNS, manageLoadBalancer, setupVPN, configureFirewall, monitorTraffic, diagnoseNetwork
    NetworkAgentService,
    // 7. Container — createContainer, stopContainer, listContainers, inspectContainer, manageImage, orchestratePods
    ContainerAgentService,
    // 8. Configuration — getConfig, setConfig, manageFeatureFlag, detectDrift, validateConfig, rollbackConfig
    ConfigurationAgentService,
  ],
  exports: [
    DeploymentAgentService,
    MonitoringAgentService,
    LoggingAgentService,
    BackupAgentService,
    ScalingAgentService,
    NetworkAgentService,
    ContainerAgentService,
    ConfigurationAgentService,
  ],
})
export class InfrastructureClusterModule {}
