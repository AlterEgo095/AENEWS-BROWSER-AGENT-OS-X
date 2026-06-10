/**
 * AENEWS Agent OS X - Computer Cluster Module
 * Aggregates all 7 computer agents into a single NestJS module.
 * Imports the BaseAgentModule for shared infrastructure (event bus, memory).
 * Provides all computer agent services for dependency injection.
 */

import { Module } from '@nestjs/common';
import { BaseAgentModule } from '../base/base-agent.module';
import { FileSystemAgentService } from './filesystem/filesystem-agent.service';
import { ProcessManagerAgentService } from './process-manager/process-manager-agent.service';
import { TerminalAgentService } from './terminal/terminal-agent.service';
import { ClipboardAgentService } from './clipboard/clipboard-agent.service';
import { ScreenCaptureAgentService } from './screen-capture/screen-capture-agent.service';
import { NotificationAgentService } from './notification/notification-agent.service';
import { SystemMonitorAgentService } from './system-monitor/system-monitor-agent.service';

@Module({
  imports: [BaseAgentModule],
  providers: [
    // 1. FileSystem — read, write, create, delete, move, copy, list, info
    FileSystemAgentService,
    // 2. Process Manager — start, stop, list, info, monitor, kill processes
    ProcessManagerAgentService,
    // 3. Terminal — execute commands, scripts, history, pipe commands
    TerminalAgentService,
    // 4. Clipboard — read, write, clear, watch clipboard
    ClipboardAgentService,
    // 5. Screen Capture — capture screen, window, region, record
    ScreenCaptureAgentService,
    // 6. Notification — send, list, clear notifications, set reminders
    NotificationAgentService,
    // 7. System Monitor — CPU, memory, disk, network, system info, monitor
    SystemMonitorAgentService,
  ],
  exports: [
    FileSystemAgentService,
    ProcessManagerAgentService,
    TerminalAgentService,
    ClipboardAgentService,
    ScreenCaptureAgentService,
    NotificationAgentService,
    SystemMonitorAgentService,
  ],
})
export class ComputerClusterModule {}
