/**
 * AENEWS Software Factory — Business Connector
 *
 * Maps business.* capabilities to LLM-based content generation:
 *   business.seo         → Generate SEO strategy + keywords
 *   business.marketing   → Generate marketing plan
 *   business.copywriting → Generate copy/content
 *   business.branding    → Generate brand guidelines
 *   business.crm         → Generate CRM data/strategy
 *   business.analytics   → Generate analytics report
 *   business.finance     → Generate financial analysis
 *   business.sales       → Generate sales materials
 *   business.legal       → Generate legal document draft
 *   business.partnership → Generate partnership proposal
 *
 * Tools: z-ai-web-dev-sdk (LLM), fs (file writes)
 */

import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { CapabilityId, CapabilityPack, BusinessCapability } from '../interfaces';
import {
  ICapabilityConnector,
  ConnectorInput,
  ConnectorOutput,
  GeneratedArtifact,
} from './connector.interface';
import { LLMHelper } from './llm-helper';

@Injectable()
export class BusinessConnector implements ICapabilityConnector {
  readonly supportedPack = CapabilityPack.BUSINESS;
  private readonly logger = new Logger(BusinessConnector.name);
  private readonly llm = new LLMHelper();

  private static readonly BUSINESS_CAPABILITIES = new Set<string>(
    Object.values(BusinessCapability),
  );

  /** System prompts per capability — specialized for each business domain */
  private static readonly SYSTEM_PROMPTS: Record<string, string> = {
    [BusinessCapability.SEO]:
      'You are an SEO expert. Generate comprehensive SEO strategies with keywords, meta descriptions, and optimization recommendations.',
    [BusinessCapability.MARKETING]:
      'You are a marketing strategist. Create detailed marketing plans with channels, budgets, timelines, and KPIs.',
    [BusinessCapability.COPYWRITING]:
      'You are an expert copywriter. Write compelling, persuasive content that converts.',
    [BusinessCapability.BRANDING]:
      'You are a brand strategist. Develop brand guidelines including voice, tone, visual direction, and positioning.',
    [BusinessCapability.CRM]:
      'You are a CRM specialist. Design customer relationship strategies and data structures.',
    [BusinessCapability.ANALYTICS]:
      'You are a data analyst. Generate analytical reports with insights, metrics, and recommendations.',
    [BusinessCapability.FINANCE]:
      'You are a financial analyst. Produce financial analyses with projections, risk assessments, and recommendations.',
    [BusinessCapability.SALES]:
      'You are a sales strategist. Create sales materials including pitch decks, objection handling, and closing strategies.',
    [BusinessCapability.LEGAL]:
      'You are a legal document specialist. Draft professional legal documents and contracts. Note: always include a disclaimer that this is not legal advice.',
    [BusinessCapability.PARTNERSHIP]:
      'You are a partnership strategist. Create partnership proposals with mutual value propositions and terms.',
  };

  supports(capabilityId: CapabilityId): boolean {
    return BusinessConnector.BUSINESS_CAPABILITIES.has(capabilityId as string);
  }

  async execute(capabilityId: CapabilityId, input: ConnectorInput): Promise<ConnectorOutput> {
    const startTime = Date.now();
    const capId = capabilityId as BusinessCapability;

    this.logger.log(`Business connector executing: ${capId} for mission ${input.missionId}`);

    try {
      const systemPrompt =
        BusinessConnector.SYSTEM_PROMPTS[capId] ||
        'You are a business consultant. Generate professional business content.';

      const userPrompt = `Generate content for: "${input.instruction}"
${input.parameters.context ? `Context: ${JSON.stringify(input.parameters.context)}` : ''}
${input.parameters.target ? `Target audience: ${input.parameters.target}` : ''}
${input.parameters.industry ? `Industry: ${input.parameters.industry}` : ''}

Be specific, actionable, and professional. Use markdown formatting.`;

      const llmResult = await this.llm.call({ systemPrompt, userPrompt, maxTokens: 4096 });

      // Write output file
      const docsDir = path.join(input.workspaceDir, 'docs', 'business');
      fs.mkdirSync(docsDir, { recursive: true });
      const fileName = `${capId.replace('business.', '')}.md`;
      const filePath = path.join(docsDir, fileName);
      fs.writeFileSync(filePath, llmResult.content, 'utf-8');

      const result: ConnectorOutput = {
        success: true,
        artifacts: [this.makeArtifact(fileName, 'document', filePath, llmResult.content)],
        output: { content: llmResult.content.substring(0, 1500) },
        costUsd: llmResult.costUsd,
        durationMs: 0,
      };

      result.durationMs = Date.now() - startTime;
      return result;
    } catch (error: any) {
      this.logger.error(`Business connector failed for ${capId}: ${error.message}`);
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

  private makeArtifact(
    name: string,
    type: GeneratedArtifact['type'],
    fullPath: string,
    content: string,
  ): GeneratedArtifact {
    return {
      name,
      type,
      path: fullPath,
      size: Buffer.byteLength(content),
      content: content.substring(0, 500),
    };
  }
}
