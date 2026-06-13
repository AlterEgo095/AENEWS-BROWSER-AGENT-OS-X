/**
 * AENEWS Software Factory — Office Connector
 *
 * Maps office.* capabilities to LLM-based document generation:
 *   office.pdf         → Generate PDF-ready markdown + convert
 *   office.docx        → Generate DOCX-ready content
 *   office.excel       → Generate CSV/XLSX data
 *   office.powerpoint  → Generate presentation outline
 *   office.ocr         → LLM-based text extraction
 *   office.signature   → Generate signature placeholder
 *   office.email       → Generate email content
 *   office.calendar    → Generate calendar event
 *
 * Tools: z-ai-web-dev-sdk (LLM), fs (file writes)
 */

import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import {
  CapabilityId,
  CapabilityPack,
  OfficeCapability,
} from '../interfaces';
import {
  ICapabilityConnector,
  ConnectorInput,
  ConnectorOutput,
  GeneratedArtifact,
} from './connector.interface';
import { LLMHelper } from './llm-helper';

@Injectable()
export class OfficeConnector implements ICapabilityConnector {
  readonly supportedPack = CapabilityPack.OFFICE;
  private readonly logger = new Logger(OfficeConnector.name);
  private readonly llm = new LLMHelper();

  private static readonly OFFICE_CAPABILITIES = new Set<string>(Object.values(OfficeCapability));

  supports(capabilityId: CapabilityId): boolean {
    return OfficeConnector.OFFICE_CAPABILITIES.has(capabilityId as string);
  }

  async execute(capabilityId: CapabilityId, input: ConnectorInput): Promise<ConnectorOutput> {
    const startTime = Date.now();
    const capId = capabilityId as OfficeCapability;

    this.logger.log(`Office connector executing: ${capId} for mission ${input.missionId}`);

    try {
      let result: ConnectorOutput;

      switch (capId) {
        case OfficeCapability.PDF:
          result = await this.executePdf(input);
          break;
        case OfficeCapability.DOCX:
          result = await this.executeDocx(input);
          break;
        case OfficeCapability.EXCEL:
          result = await this.executeExcel(input);
          break;
        case OfficeCapability.POWERPOINT:
          result = await this.executePowerpoint(input);
          break;
        case OfficeCapability.OCR:
          result = await this.executeOcr(input);
          break;
        case OfficeCapability.SIGNATURE:
          result = await this.executeSignature(input);
          break;
        case OfficeCapability.EMAIL:
          result = await this.executeEmail(input);
          break;
        case OfficeCapability.CALENDAR:
          result = await this.executeCalendar(input);
          break;
        default:
          result = await this.executeGenericOffice(capId, input);
      }

      result.durationMs = Date.now() - startTime;
      return result;
    } catch (error: any) {
      this.logger.error(`Office connector failed for ${capId}: ${error.message}`);
      return {
        success: false,
        artifacts: [],
        output: { error: error.message },
        costUsd: 0,
        durationMs: Date.now() - startTime,
        error: error.message,
      };
    }
  }

  // ─── office.pdf → Generate PDF-ready report ────────────────

  private async executePdf(input: ConnectorInput): Promise<ConnectorOutput> {
    const llmResult = await this.llm.call({
      systemPrompt: 'You are a professional report writer. Generate a comprehensive report in markdown that can be converted to PDF.',
      userPrompt: `Generate a professional PDF report for: "${input.instruction}"\n${input.parameters.context ? `Context: ${JSON.stringify(input.parameters.context)}` : ''}\n\nInclude: executive summary, methodology, findings, recommendations, conclusion. Use markdown formatting.`,
      maxTokens: 4096,
    });

    const docsDir = path.join(input.workspaceDir, 'docs');
    fs.mkdirSync(docsDir, { recursive: true });
    const reportPath = path.join(docsDir, 'report.md');
    fs.writeFileSync(reportPath, llmResult.content, 'utf-8');

    return {
      success: true,
      artifacts: [this.makeArtifact('report.md', 'document', reportPath, llmResult.content)],
      output: { content: llmResult.content.substring(0, 1000) },
      costUsd: llmResult.costUsd,
      durationMs: 0,
    };
  }

  // ─── office.docx → Generate DOCX-ready content ─────────────

  private async executeDocx(input: ConnectorInput): Promise<ConnectorOutput> {
    const llmResult = await this.llm.call({
      systemPrompt: 'You are a professional document writer. Generate a complete document with proper headings and sections.',
      userPrompt: `Generate a professional document for: "${input.instruction}"\n\nUse markdown format with clear headings (# H1, ## H2, ### H3).`,
      maxTokens: 4096,
    });

    const docsDir = path.join(input.workspaceDir, 'docs');
    fs.mkdirSync(docsDir, { recursive: true });
    const docPath = path.join(docsDir, 'document.md');
    fs.writeFileSync(docPath, llmResult.content, 'utf-8');

    return {
      success: true,
      artifacts: [this.makeArtifact('document.md', 'document', docPath, llmResult.content)],
      output: { content: llmResult.content.substring(0, 1000) },
      costUsd: llmResult.costUsd,
      durationMs: 0,
    };
  }

  // ─── office.excel → Generate CSV/XLSX data ─────────────────

  private async executeExcel(input: ConnectorInput): Promise<ConnectorOutput> {
    const llmResult = await this.llm.call({
      systemPrompt: 'You are a data analyst. Generate structured data in CSV format.',
      userPrompt: `Generate spreadsheet data for: "${input.instruction}"\n${input.parameters.schema ? `Schema: ${JSON.stringify(input.parameters.schema)}` : ''}\n\nOutput valid CSV with headers. Include at least 10 rows of realistic data.`,
      maxTokens: 4096,
    });

    const dataDir = path.join(input.workspaceDir, 'data');
    fs.mkdirSync(dataDir, { recursive: true });
    const csvPath = path.join(dataDir, 'data.csv');
    fs.writeFileSync(csvPath, llmResult.content, 'utf-8');

    return {
      success: true,
      artifacts: [this.makeArtifact('data.csv', 'source', csvPath, llmResult.content)],
      output: { content: llmResult.content.substring(0, 500) },
      costUsd: llmResult.costUsd,
      durationMs: 0,
    };
  }

  // ─── office.powerpoint → Generate presentation outline ──────

  private async executePowerpoint(input: ConnectorInput): Promise<ConnectorOutput> {
    const llmResult = await this.llm.call({
      systemPrompt: 'You are a presentation designer. Generate a detailed presentation outline in markdown.',
      userPrompt: `Create a presentation outline for: "${input.instruction}"\n\nFormat:\n# Slide 1: Title\n- Bullet 1\n- Bullet 2\n\n# Slide 2: ...\n\nCreate 8-12 slides with clear talking points.`,
      maxTokens: 4096,
    });

    const docsDir = path.join(input.workspaceDir, 'docs');
    fs.mkdirSync(docsDir, { recursive: true });
    const pptxPath = path.join(docsDir, 'presentation.md');
    fs.writeFileSync(pptxPath, llmResult.content, 'utf-8');

    return {
      success: true,
      artifacts: [this.makeArtifact('presentation.md', 'document', pptxPath, llmResult.content)],
      output: { content: llmResult.content.substring(0, 500) },
      costUsd: llmResult.costUsd,
      durationMs: 0,
    };
  }

  // ─── office.ocr → LLM-based text extraction ────────────────

  private async executeOcr(input: ConnectorInput): Promise<ConnectorOutput> {
    const filePath = input.parameters.filePath;
    if (!filePath || !fs.existsSync(filePath)) {
      return {
        success: false,
        artifacts: [],
        output: { error: 'No valid file path provided for OCR' },
        costUsd: 0,
        durationMs: 0,
        error: 'Missing filePath for OCR',
      };
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const llmResult = await this.llm.call({
      systemPrompt: 'You are an OCR specialist. Extract and clean text from this content.',
      userPrompt: `Extract and organize all text content from this file:\n\n${content.substring(0, 3000)}`,
      maxTokens: 4096,
    });

    const dataDir = path.join(input.workspaceDir, 'data');
    fs.mkdirSync(dataDir, { recursive: true });
    const ocrPath = path.join(dataDir, 'extracted-text.txt');
    fs.writeFileSync(ocrPath, llmResult.content, 'utf-8');

    return {
      success: true,
      artifacts: [this.makeArtifact('extracted-text.txt', 'document', ocrPath, llmResult.content)],
      output: { sourceFile: filePath, extractedLength: llmResult.content.length },
      costUsd: llmResult.costUsd,
      durationMs: 0,
    };
  }

  // ─── office.signature → Generate signature placeholder ──────

  private async executeSignature(input: ConnectorInput): Promise<ConnectorOutput> {
    const signDir = path.join(input.workspaceDir, 'docs');
    fs.mkdirSync(signDir, { recursive: true });

    const signContent = `# Document Signature\n\n**Document:** ${input.instruction}\n**Date:** ${new Date().toISOString()}\n**Signer:** ${input.parameters.signer || 'Authorized Personnel'}\n\n---\n\n[SIGNATURE PLACEHOLDER]\n\n---\n\n*This document was generated and signed by AENEWS Software Factory*`;
    const signPath = path.join(signDir, 'signature.md');
    fs.writeFileSync(signPath, signContent, 'utf-8');

    return {
      success: true,
      artifacts: [this.makeArtifact('signature.md', 'document', signPath, signContent)],
      output: { signer: input.parameters.signer || 'Authorized Personnel' },
      costUsd: 0,
      durationMs: 0,
    };
  }

  // ─── office.email → Generate email content ─────────────────

  private async executeEmail(input: ConnectorInput): Promise<ConnectorOutput> {
    const llmResult = await this.llm.call({
      systemPrompt: 'You are a professional email writer. Generate a well-structured email.',
      userPrompt: `Write a professional email for: "${input.instruction}"\n${input.parameters.recipient ? `To: ${input.parameters.recipient}` : ''}\n${input.parameters.tone ? `Tone: ${input.parameters.tone}` : 'professional'}\n\nInclude subject line, greeting, body, and sign-off.`,
      maxTokens: 2048,
    });

    const dataDir = path.join(input.workspaceDir, 'data');
    fs.mkdirSync(dataDir, { recursive: true });
    const emailPath = path.join(dataDir, 'email.md');
    fs.writeFileSync(emailPath, llmResult.content, 'utf-8');

    return {
      success: true,
      artifacts: [this.makeArtifact('email.md', 'document', emailPath, llmResult.content)],
      output: { content: llmResult.content.substring(0, 500) },
      costUsd: llmResult.costUsd,
      durationMs: 0,
    };
  }

  // ─── office.calendar → Generate calendar event ─────────────

  private async executeCalendar(input: ConnectorInput): Promise<ConnectorOutput> {
    const event = {
      title: input.parameters.title || input.instruction,
      date: input.parameters.date || new Date().toISOString().split('T')[0],
      time: input.parameters.time || '10:00',
      duration: input.parameters.duration || '1h',
      location: input.parameters.location || 'Online',
      description: input.parameters.description || input.instruction,
      attendees: input.parameters.attendees || [],
    };

    // Generate ICS format
    const icsContent = this.generateICS(event);
    const dataDir = path.join(input.workspaceDir, 'data');
    fs.mkdirSync(dataDir, { recursive: true });
    const icsPath = path.join(dataDir, 'event.ics');
    fs.writeFileSync(icsPath, icsContent, 'utf-8');

    return {
      success: true,
      artifacts: [this.makeArtifact('event.ics', 'config', icsPath, icsContent)],
      output: { event },
      costUsd: 0,
      durationMs: 0,
    };
  }

  // ─── Generic fallback ───────────────────────────────────────

  private async executeGenericOffice(capId: OfficeCapability, input: ConnectorInput): Promise<ConnectorOutput> {
    const llmResult = await this.llm.call({
      systemPrompt: 'You are a professional content generator. Create the requested content.',
      userPrompt: `Generate content for: "${capId}" — "${input.instruction}"`,
      maxTokens: 2048,
    });

    const docsDir = path.join(input.workspaceDir, 'docs');
    fs.mkdirSync(docsDir, { recursive: true });
    const docPath = path.join(docsDir, `${capId.replace('office.', '')}.md`);
    fs.writeFileSync(docPath, llmResult.content, 'utf-8');

    return {
      success: true,
      artifacts: [this.makeArtifact(`${capId.replace('office.', '')}.md`, 'document', docPath, llmResult.content)],
      output: { content: llmResult.content.substring(0, 500) },
      costUsd: llmResult.costUsd,
      durationMs: 0,
    };
  }

  // ─── Helpers ────────────────────────────────────────────────

  private makeArtifact(name: string, type: GeneratedArtifact['type'], fullPath: string, content: string): GeneratedArtifact {
    return { name, type, path: fullPath, size: Buffer.byteLength(content), content: content.substring(0, 500) };
  }

  private generateICS(event: any): string {
    const dtStart = event.date.replace(/-/g, '') + 'T' + event.time.replace(':', '') + '00';
    return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//AENEWS//Software Factory//EN
BEGIN:VEVENT
DTSTART:${dtStart}
SUMMARY:${event.title}
LOCATION:${event.location}
DESCRIPTION:${event.description}
END:VEVENT
END:VCALENDAR`;
  }
}
