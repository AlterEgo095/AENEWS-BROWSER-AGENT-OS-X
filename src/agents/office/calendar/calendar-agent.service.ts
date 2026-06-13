/**
 * AENEWS Agent OS X - Calendar Agent
 * Manages calendar operations: schedule, reschedule, cancel events, find free slots.
 * Provides full calendar lifecycle management with invitation and reminder support.
 */

import { Injectable, Inject } from '@nestjs/common';
import { BaseAgentService } from '../../base/base-agent.service';
import {
  AgentConfig,
  AgentCluster,
  AgentInput,
  AgentOutput,
} from '../../interfaces/agent.interface';
import { AgentConnectorBridge } from '../../bridge';
import { OfficeCapability } from '../../../software-factory/interfaces';

// ─── Agent Configuration ──────────────────────────────────────────

export const CALENDAR_AGENT_CONFIG: AgentConfig = {
  id: 'office-calendar',
  name: 'Calendar',
  cluster: AgentCluster.OFFICE,
  version: '1.0.0',
  description:
    'Calendar management agent that handles scheduling, rescheduling, canceling events, finding free slots, managing invitations, and setting reminders.',
  capabilities: [
    {
      name: 'createEvent',
      description:
        'Create a new calendar event with title, time, duration, attendees, and location',
      inputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Event title' },
          description: { type: 'string', description: 'Event description' },
          startTime: { type: 'string', description: 'Event start time (ISO string)' },
          endTime: { type: 'string', description: 'Event end time (ISO string)' },
          location: { type: 'string', description: 'Event location' },
          attendees: {
            type: 'array',
            items: { type: 'string' },
            description: 'Attendee email addresses',
          },
          isRecurring: { type: 'boolean', description: 'Whether the event is recurring' },
          recurrenceRule: { type: 'string', description: 'RRULE recurrence pattern' },
          color: { type: 'string', description: 'Calendar color label' },
        },
        required: ['title', 'startTime', 'endTime'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          eventId: { type: 'string' },
          status: { type: 'string' },
          createdAt: { type: 'string' },
        },
      },
    },
    {
      name: 'updateEvent',
      description: 'Update an existing calendar event',
      inputSchema: {
        type: 'object',
        properties: {
          eventId: { type: 'string', description: 'ID of the event to update' },
          title: { type: 'string', description: 'New event title' },
          description: { type: 'string', description: 'New description' },
          startTime: { type: 'string', description: 'New start time (ISO string)' },
          endTime: { type: 'string', description: 'New end time (ISO string)' },
          location: { type: 'string', description: 'New location' },
          attendees: {
            type: 'array',
            items: { type: 'string' },
            description: 'Updated attendee list',
          },
        },
        required: ['eventId'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          eventId: { type: 'string' },
          updatedFields: { type: 'array', items: { type: 'string' } },
          status: { type: 'string' },
        },
      },
    },
    {
      name: 'deleteEvent',
      description: 'Delete or cancel a calendar event',
      inputSchema: {
        type: 'object',
        properties: {
          eventId: { type: 'string', description: 'ID of the event to delete' },
          notifyAttendees: {
            type: 'boolean',
            default: true,
            description: 'Whether to notify attendees of cancellation',
          },
          cancellationReason: { type: 'string', description: 'Reason for cancellation' },
        },
        required: ['eventId'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          eventId: { type: 'string' },
          status: { type: 'string' },
          notifiedAttendees: { type: 'number' },
        },
      },
    },
    {
      name: 'findFreeSlots',
      description: 'Find available time slots in a given date range',
      inputSchema: {
        type: 'object',
        properties: {
          dateFrom: { type: 'string', description: 'Start of date range (ISO string)' },
          dateTo: { type: 'string', description: 'End of date range (ISO string)' },
          durationMinutes: { type: 'number', description: 'Required slot duration in minutes' },
          workingHoursOnly: {
            type: 'boolean',
            default: true,
            description: 'Only consider working hours',
          },
          attendees: {
            type: 'array',
            items: { type: 'string' },
            description: 'Attendees to check availability for',
          },
        },
        required: ['dateFrom', 'dateTo', 'durationMinutes'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          freeSlots: { type: 'array', items: { type: 'object' } },
          totalSlots: { type: 'number' },
        },
      },
    },
    {
      name: 'getSchedule',
      description: 'Get the schedule for a given date range',
      inputSchema: {
        type: 'object',
        properties: {
          dateFrom: { type: 'string', description: 'Start of date range (ISO string)' },
          dateTo: { type: 'string', description: 'End of date range (ISO string)' },
          includeCancelled: {
            type: 'boolean',
            default: false,
            description: 'Include cancelled events',
          },
        },
        required: ['dateFrom', 'dateTo'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          events: { type: 'array', items: { type: 'object' } },
          total: { type: 'number' },
        },
      },
    },
    {
      name: 'sendInvitation',
      description: 'Send a calendar invitation to attendees for an existing event',
      inputSchema: {
        type: 'object',
        properties: {
          eventId: { type: 'string', description: 'ID of the event' },
          attendees: {
            type: 'array',
            items: { type: 'string' },
            description: 'Email addresses to invite',
          },
          message: { type: 'string', description: 'Optional personal message with the invitation' },
        },
        required: ['eventId', 'attendees'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          eventId: { type: 'string' },
          invitedAttendees: { type: 'array', items: { type: 'string' } },
          status: { type: 'string' },
        },
      },
    },
    {
      name: 'setReminder',
      description: 'Set a reminder for a calendar event',
      inputSchema: {
        type: 'object',
        properties: {
          eventId: { type: 'string', description: 'ID of the event' },
          minutesBefore: {
            type: 'number',
            description: 'Minutes before the event to trigger the reminder',
          },
          method: {
            type: 'string',
            enum: ['email', 'popup', 'sms'],
            description: 'Reminder delivery method',
          },
        },
        required: ['eventId', 'minutesBefore'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          eventId: { type: 'string' },
          reminderId: { type: 'string' },
          triggerAt: { type: 'string' },
          status: { type: 'string' },
        },
      },
    },
  ],
  permissions: [
    'execute:task',
    'read:calendar',
    'write:calendar',
    'delete:calendar',
    'send:invitation',
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

interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  location: string;
  organizer: string;
  attendees: EventAttendee[];
  status: 'confirmed' | 'tentative' | 'cancelled';
  isRecurring: boolean;
  recurrenceRule?: string;
  reminders: EventReminder[];
  color: string;
  createdAt: Date;
  updatedAt: Date;
}

interface EventAttendee {
  email: string;
  name?: string;
  responseStatus: 'needsAction' | 'accepted' | 'declined' | 'tentative';
}

interface EventReminder {
  id: string;
  minutesBefore: number;
  method: 'email' | 'popup' | 'sms';
  triggered: boolean;
}

interface FreeSlot {
  startTime: Date;
  endTime: Date;
  durationMinutes: number;
}

// ─── Agent Service ────────────────────────────────────────────────

@Injectable()
export class CalendarAgentService extends BaseAgentService {
  private events: Map<string, CalendarEvent> = new Map();
  private eventCounter: number = 0;
  private reminderCounter: number = 0;

  constructor(
    eventBusService?: any,
    memoryService?: any,
    permissionEvaluator?: any,
    @Inject(AgentConnectorBridge) private readonly bridge?: AgentConnectorBridge,
  ) {
    super(eventBusService, memoryService, permissionEvaluator);
  }

  protected defineConfig(): AgentConfig {
    return CALENDAR_AGENT_CONFIG;
  }

  protected async onInitialize(): Promise<void> {
    // Register tools
    this.registerTool({
      name: 'createEvent',
      description: 'Create a new calendar event',
      execute: async (params: {
        title: string;
        description?: string;
        startTime: string;
        endTime: string;
        location?: string;
        attendees?: string[];
        isRecurring?: boolean;
        recurrenceRule?: string;
        color?: string;
      }) => this.createEvent(params),
    });

    this.registerTool({
      name: 'updateEvent',
      description: 'Update an existing calendar event',
      execute: async (params: {
        eventId: string;
        title?: string;
        description?: string;
        startTime?: string;
        endTime?: string;
        location?: string;
        attendees?: string[];
      }) => this.updateEvent(params),
    });

    this.registerTool({
      name: 'deleteEvent',
      description: 'Delete or cancel a calendar event',
      execute: async (params: {
        eventId: string;
        notifyAttendees?: boolean;
        cancellationReason?: string;
      }) => this.deleteEvent(params),
    });

    this.registerTool({
      name: 'findFreeSlots',
      description: 'Find available time slots in a date range',
      execute: async (params: {
        dateFrom: string;
        dateTo: string;
        durationMinutes: number;
        workingHoursOnly?: boolean;
        attendees?: string[];
      }) => this.findFreeSlots(params),
    });

    this.registerTool({
      name: 'getSchedule',
      description: 'Get the schedule for a given date range',
      execute: async (params: { dateFrom: string; dateTo: string; includeCancelled?: boolean }) =>
        this.getSchedule(params),
    });

    this.registerTool({
      name: 'sendInvitation',
      description: 'Send a calendar invitation to attendees',
      execute: async (params: { eventId: string; attendees: string[]; message?: string }) =>
        this.sendInvitation(params),
    });

    this.registerTool({
      name: 'setReminder',
      description: 'Set a reminder for a calendar event',
      execute: async (params: {
        eventId: string;
        minutesBefore: number;
        method?: 'email' | 'popup' | 'sms';
      }) => this.setReminder(params),
    });

    await this.storeInWorkingMemory('calendar:initializedAt', new Date().toISOString(), 600000);
    this.logger.log('Calendar agent initialized with 7 tools');
  }

  protected async onExecute(input: AgentInput): Promise<AgentOutput> {
    const startTime = Date.now();

    // Bridge delegation: try real connector first, fallback to simulated logic
    if (this.bridge) {
      try {
        const result = await this.bridge.executeCapability(OfficeCapability.CALENDAR, {
          missionId: input.taskId,
          instruction: JSON.stringify(input.payload),
          workspaceDir: `/tmp/aenews-workspace/${input.taskId}`,
          parameters: input.payload,
        });
        return this.createAgentOutput(
          input.taskId,
          result.success,
          result.output,
          result.error,
          startTime,
        );
      } catch (error) {
        this.logger.warn(`Bridge failed, fallback: ${(error as Error).message}`);
      }
    }

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

    const supportedActions = [
      'createEvent',
      'updateEvent',
      'deleteEvent',
      'findFreeSlots',
      'getSchedule',
      'sendInvitation',
      'setReminder',
    ];

    if (!supportedActions.includes(action)) {
      return this.createAgentOutput(
        input.taskId,
        false,
        null,
        `Unknown calendar action: ${action}. Supported: ${supportedActions.join(', ')}`,
        startTime,
      );
    }

    try {
      const tool = this.getTool(action);
      if (!tool) {
        return this.createAgentOutput(
          input.taskId,
          false,
          null,
          `Tool not found: ${action}`,
          startTime,
        );
      }

      const result = await tool.execute(params);

      await this.storeInWorkingMemory(
        `calendar:last:${action}`,
        { params, result, timestamp: new Date() },
        300000,
      );

      return this.createAgentOutput(input.taskId, true, result, undefined, startTime);
    } catch (error) {
      const msg = (error as Error).message;
      this.logger.error(`Calendar execution failed for ${action}: ${msg}`);
      return this.createAgentOutput(input.taskId, false, null, msg, startTime);
    }
  }

  protected async onDestroy(): Promise<void> {
    this.events.clear();
    this.eventCounter = 0;
    this.reminderCounter = 0;
    this.logger.log('Calendar agent destroyed, events cleared');
  }

  // ─── Tool Implementations ──────────────────────────────────────

  private async createEvent(params: {
    title: string;
    description?: string;
    startTime: string;
    endTime: string;
    location?: string;
    attendees?: string[];
    isRecurring?: boolean;
    recurrenceRule?: string;
    color?: string;
  }): Promise<{
    eventId: string;
    status: string;
    createdAt: string;
  }> {
    const {
      title,
      description = '',
      startTime,
      endTime,
      location = '',
      attendees = [],
      isRecurring = false,
      recurrenceRule,
      color = 'default',
    } = params;

    if (!title || typeof title !== 'string') {
      throw new Error('A valid event title is required');
    }
    if (!startTime || !endTime) {
      throw new Error('Both startTime and endTime are required');
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (isNaN(start.getTime())) {
      throw new Error('Invalid startTime: must be a valid ISO date string');
    }
    if (isNaN(end.getTime())) {
      throw new Error('Invalid endTime: must be a valid ISO date string');
    }
    if (end <= start) {
      throw new Error('endTime must be after startTime');
    }

    // Check for conflicts
    const conflicts = this.findConflicts(start, end);
    if (conflicts.length > 0) {
      this.logger.warn(`Event "${title}" conflicts with ${conflicts.length} existing event(s)`);
    }

    const eventId = this.generateEventId();
    const eventAttendees: EventAttendee[] = attendees.map((email) => ({
      email,
      responseStatus: 'needsAction' as const,
    }));

    const event: CalendarEvent = {
      id: eventId,
      title,
      description,
      startTime: start,
      endTime: end,
      location,
      organizer: 'agent@aenews.system',
      attendees: eventAttendees,
      status: 'confirmed',
      isRecurring,
      recurrenceRule,
      reminders: [],
      color,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.events.set(eventId, event);

    this.logger.log(
      `Created event: ${eventId}, title="${title}", ${start.toISOString()} - ${end.toISOString()}`,
    );

    return {
      eventId,
      status: 'confirmed',
      createdAt: event.createdAt.toISOString(),
    };
  }

  private async updateEvent(params: {
    eventId: string;
    title?: string;
    description?: string;
    startTime?: string;
    endTime?: string;
    location?: string;
    attendees?: string[];
  }): Promise<{
    eventId: string;
    updatedFields: string[];
    status: string;
  }> {
    const { eventId, title, description, startTime, endTime, location, attendees } = params;

    if (!eventId || typeof eventId !== 'string') {
      throw new Error('A valid eventId is required');
    }

    const event = this.events.get(eventId);
    if (!event) {
      throw new Error(`Event not found: ${eventId}`);
    }

    if (event.status === 'cancelled') {
      throw new Error(`Cannot update a cancelled event: ${eventId}`);
    }

    const updatedFields: string[] = [];

    if (title !== undefined) {
      event.title = title;
      updatedFields.push('title');
    }
    if (description !== undefined) {
      event.description = description;
      updatedFields.push('description');
    }
    if (startTime !== undefined) {
      const start = new Date(startTime);
      if (isNaN(start.getTime())) {
        throw new Error('Invalid startTime');
      }
      event.startTime = start;
      updatedFields.push('startTime');
    }
    if (endTime !== undefined) {
      const end = new Date(endTime);
      if (isNaN(end.getTime())) {
        throw new Error('Invalid endTime');
      }
      event.endTime = end;
      updatedFields.push('endTime');
    }
    if (location !== undefined) {
      event.location = location;
      updatedFields.push('location');
    }
    if (attendees !== undefined) {
      event.attendees = attendees.map((email) => ({
        email,
        responseStatus: 'needsAction' as const,
      }));
      updatedFields.push('attendees');
    }

    // Validate time range after update
    if (event.endTime <= event.startTime) {
      throw new Error('endTime must be after startTime');
    }

    event.updatedAt = new Date();

    this.logger.log(`Updated event: ${eventId}, fields=[${updatedFields.join(',')}]`);

    return {
      eventId,
      updatedFields,
      status: event.status,
    };
  }

  private async deleteEvent(params: {
    eventId: string;
    notifyAttendees?: boolean;
    cancellationReason?: string;
  }): Promise<{
    eventId: string;
    status: string;
    notifiedAttendees: number;
  }> {
    const { eventId, notifyAttendees = true, cancellationReason } = params;

    if (!eventId || typeof eventId !== 'string') {
      throw new Error('A valid eventId is required');
    }

    const event = this.events.get(eventId);
    if (!event) {
      throw new Error(`Event not found: ${eventId}`);
    }

    if (event.status === 'cancelled') {
      throw new Error(`Event ${eventId} is already cancelled`);
    }

    event.status = 'cancelled';
    event.updatedAt = new Date();

    const notifiedAttendees = notifyAttendees ? event.attendees.length : 0;

    this.logger.log(
      `Cancelled event: ${eventId}, notified=${notifiedAttendees}, reason=${cancellationReason || 'none'}`,
    );

    return {
      eventId,
      status: 'cancelled',
      notifiedAttendees,
    };
  }

  private async findFreeSlots(params: {
    dateFrom: string;
    dateTo: string;
    durationMinutes: number;
    workingHoursOnly?: boolean;
    attendees?: string[];
  }): Promise<{
    freeSlots: FreeSlot[];
    totalSlots: number;
  }> {
    const { dateFrom, dateTo, durationMinutes, workingHoursOnly = true, attendees = [] } = params;

    if (!dateFrom || !dateTo) {
      throw new Error('Both dateFrom and dateTo are required');
    }
    if (!durationMinutes || durationMinutes <= 0) {
      throw new Error('durationMinutes must be a positive number');
    }

    const rangeStart = new Date(dateFrom);
    const rangeEnd = new Date(dateTo);

    if (isNaN(rangeStart.getTime()) || isNaN(rangeEnd.getTime())) {
      throw new Error('Invalid date range: must be valid ISO date strings');
    }
    if (rangeEnd <= rangeStart) {
      throw new Error('dateTo must be after dateFrom');
    }

    // Define working hours (9 AM - 5 PM by default)
    const workStartHour = 9;
    const workEndHour = 17;

    // Get all confirmed events in the range
    const busyEvents = Array.from(this.events.values()).filter(
      (event) =>
        event.status === 'confirmed' && event.startTime < rangeEnd && event.endTime > rangeStart,
    );

    // Generate free slots by iterating through each day
    const freeSlots: FreeSlot[] = [];
    const currentDay = new Date(rangeStart);

    while (currentDay < rangeEnd) {
      const dayStart = new Date(currentDay);
      const dayEnd = new Date(currentDay);

      if (workingHoursOnly) {
        dayStart.setHours(workStartHour, 0, 0, 0);
        dayEnd.setHours(workEndHour, 0, 0, 0);
      } else {
        dayStart.setHours(0, 0, 0, 0);
        dayEnd.setHours(23, 59, 59, 999);
      }

      // Adjust for range boundaries
      const slotStart = dayStart < rangeStart ? rangeStart : dayStart;
      const slotEnd = dayEnd > rangeEnd ? rangeEnd : dayEnd;

      if (slotStart >= slotEnd) {
        currentDay.setDate(currentDay.getDate() + 1);
        continue;
      }

      // Skip weekends if working hours only
      if (workingHoursOnly && (currentDay.getDay() === 0 || currentDay.getDay() === 6)) {
        currentDay.setDate(currentDay.getDate() + 1);
        continue;
      }

      // Get busy intervals for this day
      const dayBusy = busyEvents
        .filter((e) => e.startTime < slotEnd && e.endTime > slotStart)
        .map((e) => ({
          start: e.startTime < slotStart ? slotStart : e.startTime,
          end: e.endTime > slotEnd ? slotEnd : e.endTime,
        }))
        .sort((a, b) => a.start.getTime() - b.start.getTime());

      // Merge overlapping busy intervals
      const mergedBusy = this.mergeIntervals(dayBusy);

      // Find free slots in between busy intervals
      let cursor = new Date(slotStart);

      for (const busy of mergedBusy) {
        const freeDuration = (busy.start.getTime() - cursor.getTime()) / 60000;
        if (freeDuration >= durationMinutes) {
          freeSlots.push({
            startTime: new Date(cursor),
            endTime: new Date(busy.start),
            durationMinutes: Math.floor(freeDuration),
          });
        }
        cursor = new Date(busy.end);
      }

      // Check remaining time after last busy interval
      const remainingDuration = (slotEnd.getTime() - cursor.getTime()) / 60000;
      if (remainingDuration >= durationMinutes) {
        freeSlots.push({
          startTime: new Date(cursor),
          endTime: new Date(slotEnd),
          durationMinutes: Math.floor(remainingDuration),
        });
      }

      currentDay.setDate(currentDay.getDate() + 1);
    }

    this.logger.log(
      `Found ${freeSlots.length} free slot(s) for ${durationMinutes}min between ${dateFrom} and ${dateTo}`,
    );

    return { freeSlots, totalSlots: freeSlots.length };
  }

  private async getSchedule(params: {
    dateFrom: string;
    dateTo: string;
    includeCancelled?: boolean;
  }): Promise<{
    events: CalendarEvent[];
    total: number;
  }> {
    const { dateFrom, dateTo, includeCancelled = false } = params;

    if (!dateFrom || !dateTo) {
      throw new Error('Both dateFrom and dateTo are required');
    }

    const rangeStart = new Date(dateFrom);
    const rangeEnd = new Date(dateTo);

    if (isNaN(rangeStart.getTime()) || isNaN(rangeEnd.getTime())) {
      throw new Error('Invalid date range');
    }

    let events = Array.from(this.events.values()).filter(
      (event) => event.startTime < rangeEnd && event.endTime > rangeStart,
    );

    if (!includeCancelled) {
      events = events.filter((e) => e.status !== 'cancelled');
    }

    // Sort by start time
    events.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

    this.logger.log(
      `Retrieved schedule: ${events.length} event(s) between ${dateFrom} and ${dateTo}`,
    );

    return { events, total: events.length };
  }

  private async sendInvitation(params: {
    eventId: string;
    attendees: string[];
    message?: string;
  }): Promise<{
    eventId: string;
    invitedAttendees: string[];
    status: string;
  }> {
    const { eventId, attendees, message } = params;

    if (!eventId || typeof eventId !== 'string') {
      throw new Error('A valid eventId is required');
    }
    if (!attendees || !Array.isArray(attendees) || attendees.length === 0) {
      throw new Error('At least one attendee email is required');
    }

    const event = this.events.get(eventId);
    if (!event) {
      throw new Error(`Event not found: ${eventId}`);
    }

    if (event.status === 'cancelled') {
      throw new Error(`Cannot send invitations for a cancelled event: ${eventId}`);
    }

    // Add new attendees
    const invitedAttendees: string[] = [];
    for (const email of attendees) {
      const existing = event.attendees.find((a) => a.email === email);
      if (!existing) {
        event.attendees.push({
          email,
          responseStatus: 'needsAction',
        });
        invitedAttendees.push(email);
      } else {
        this.logger.warn(`Attendee ${email} already invited to event ${eventId}`);
      }
    }

    event.updatedAt = new Date();

    this.logger.log(
      `Sent invitation for event: ${eventId}, to=[${invitedAttendees.join(',')}], message=${message ? 'included' : 'none'}`,
    );

    return {
      eventId,
      invitedAttendees,
      status: 'sent',
    };
  }

  private async setReminder(params: {
    eventId: string;
    minutesBefore: number;
    method?: 'email' | 'popup' | 'sms';
  }): Promise<{
    eventId: string;
    reminderId: string;
    triggerAt: string;
    status: string;
  }> {
    const { eventId, minutesBefore, method = 'popup' } = params;

    if (!eventId || typeof eventId !== 'string') {
      throw new Error('A valid eventId is required');
    }
    if (!minutesBefore || minutesBefore <= 0) {
      throw new Error('minutesBefore must be a positive number');
    }

    const event = this.events.get(eventId);
    if (!event) {
      throw new Error(`Event not found: ${eventId}`);
    }

    if (event.status === 'cancelled') {
      throw new Error(`Cannot set reminder for a cancelled event: ${eventId}`);
    }

    const reminderId = `reminder-${++this.reminderCounter}`;
    const triggerAt = new Date(event.startTime.getTime() - minutesBefore * 60000);

    const reminder: EventReminder = {
      id: reminderId,
      minutesBefore,
      method,
      triggered: false,
    };

    event.reminders.push(reminder);
    event.updatedAt = new Date();

    this.logger.log(
      `Set reminder for event: ${eventId}, ${minutesBefore}min before, method=${method}`,
    );

    return {
      eventId,
      reminderId,
      triggerAt: triggerAt.toISOString(),
      status: 'set',
    };
  }

  // ─── Private Helpers ───────────────────────────────────────────

  private generateEventId(): string {
    this.eventCounter++;
    return `event-${Date.now()}-${this.eventCounter}`;
  }

  private findConflicts(start: Date, end: Date): CalendarEvent[] {
    return Array.from(this.events.values()).filter(
      (event) => event.status === 'confirmed' && event.startTime < end && event.endTime > start,
    );
  }

  private mergeIntervals(
    intervals: Array<{ start: Date; end: Date }>,
  ): Array<{ start: Date; end: Date }> {
    if (intervals.length === 0) return [];

    const merged: Array<{ start: Date; end: Date }> = [
      { start: new Date(intervals[0].start), end: new Date(intervals[0].end) },
    ];

    for (let i = 1; i < intervals.length; i++) {
      const last = merged[merged.length - 1];
      if (intervals[i].start <= last.end) {
        last.end = new Date(Math.max(last.end.getTime(), intervals[i].end.getTime()));
      } else {
        merged.push({
          start: new Date(intervals[i].start),
          end: new Date(intervals[i].end),
        });
      }
    }

    return merged;
  }
}
