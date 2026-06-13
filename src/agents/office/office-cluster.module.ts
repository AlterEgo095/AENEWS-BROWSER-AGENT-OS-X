/**
 * AENEWS Agent OS X - Office Cluster Module
 * Aggregates all 6 office agents into a single NestJS module.
 * Imports the BaseAgentModule for shared infrastructure (event bus, memory).
 * Provides all office agent services for dependency injection.
 */

import { Module } from '@nestjs/common';
import { BaseAgentModule } from '../base/base-agent.module';
import { AgentConnectorBridgeModule } from '../bridge';
import { EmailAgentService } from './email/email-agent.service';
import { CalendarAgentService } from './calendar/calendar-agent.service';
import { DocumentAgentService } from './document/document-agent.service';
import { SpreadsheetAgentService } from './spreadsheet/spreadsheet-agent.service';
import { PresentationAgentService } from './presentation/presentation-agent.service';
import { TaskManagementAgentService } from './task-management/task-management-agent.service';

@Module({
  imports: [BaseAgentModule, AgentConnectorBridgeModule],
  providers: [
    // 1. Email — compose, send, read, reply, forward, search, delete, organize
    EmailAgentService,
    // 2. Calendar — create, update, delete events, find free slots, schedule, invite, remind
    CalendarAgentService,
    // 3. Document — create, edit, convert, extract text, merge, apply template
    DocumentAgentService,
    // 4. Spreadsheet — create, update cells, formulas, charts, import/export, pivot tables
    SpreadsheetAgentService,
    // 5. Presentation — create, add slides/content, themes, export, transitions
    PresentationAgentService,
    // 6. Task Management — create, update, assign, track, report, deadline, prioritize
    TaskManagementAgentService,
  ],
  exports: [
    EmailAgentService,
    CalendarAgentService,
    DocumentAgentService,
    SpreadsheetAgentService,
    PresentationAgentService,
    TaskManagementAgentService,
  ],
})
export class OfficeClusterModule {}
