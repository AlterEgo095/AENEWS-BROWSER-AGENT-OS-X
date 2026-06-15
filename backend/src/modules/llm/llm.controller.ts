import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LLMService, LLMConfig } from './llm.service';
import { CreditService } from '../credit/credit.service';
import { IsString, IsBoolean, IsIn, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

// ─── DTOs ──────────────────────────────────────────────────────

class UpdateLLMConfigDto {
  @IsString()
  @IsIn(['zai', 'openai', 'anthropic'])
  defaultProvider!: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  fallbackEnabled?: boolean;

  @IsOptional()
  @IsString()
  @IsIn(['zai', 'openai', 'anthropic'])
  secondaryProvider?: string;
}

class SwitchProviderDto {
  @IsString()
  @IsIn(['zai', 'openai', 'anthropic'])
  provider!: string;
}

// ─── Controller ────────────────────────────────────────────────

@ApiTags('LLM')
@ApiBearerAuth()
@Controller('llm')
export class LLMController {
  constructor(
    private readonly llmService: LLMService,
    private readonly creditService: CreditService,
  ) {}

  // ─── Provider Info Endpoints ─────────────────────────────────

  @Get('providers')
  @ApiOperation({ summary: 'List all LLM providers with status and metrics' })
  async listProviders() {
    const providers = this.llmService.listProviders();
    return {
      providers: providers.map((p) => ({
        name: p.name,
        available: p.available,
        circuitState: p.circuitState || 'N/A',
        inCooldown: p.inCooldown || false,
        metrics: {
          totalRequests: p.metrics.totalRequests,
          successfulRequests: p.metrics.successfulRequests,
          failedRequests: p.metrics.failedRequests,
          totalTokens: p.metrics.totalTokens,
          lastRequestAt: p.metrics.lastRequestAt,
          lastError: p.metrics.lastError,
        },
      })),
    };
  }

  @Get('config')
  @ApiOperation({ summary: 'Get current LLM configuration' })
  async getConfig() {
    const config = this.llmService.getConfig();
    const anyAvailable = this.llmService.isAnyAvailable();
    return {
      config,
      anyProviderAvailable: anyAvailable,
      defaultProviderAvailable: this.llmService.getProvider(config.defaultProvider)?.isAvailable() ?? false,
    };
  }

  // ─── Admin Configuration Endpoints ──────────────────────────

  @Put('config')
  @ApiOperation({ summary: 'Admin: Update LLM configuration at runtime (persisted to DB)' })
  async updateConfig(@Body() dto: UpdateLLMConfigDto) {
    const config: LLMConfig = {
      defaultProvider: dto.defaultProvider,
      fallbackEnabled: dto.fallbackEnabled ?? this.llmService.getConfig().fallbackEnabled,
      secondaryProvider: dto.secondaryProvider ?? this.llmService.getConfig().secondaryProvider,
    };

    // Validate that the chosen provider is registered
    const provider = this.llmService.getProvider(config.defaultProvider);
    if (!provider) {
      return {
        success: false,
        error: `Provider "${config.defaultProvider}" is not registered`,
      };
    }

    const wasAvailable = provider.isAvailable();

    // Apply runtime configuration change
    this.llmService.applyConfig(config);

    // Persist to database so configuration survives restarts
    try {
      await this.creditService.updateSetting(
        'llm_default_provider',
        config.defaultProvider,
        'Default LLM provider (zai, openai, or anthropic)',
      );
      await this.creditService.updateSetting(
        'llm_fallback_enabled',
        String(config.fallbackEnabled),
        'Whether fallback to secondary provider is enabled',
      );
      await this.creditService.updateSetting(
        'llm_secondary_provider',
        config.secondaryProvider,
        'Secondary/fallback LLM provider',
      );
    } catch (error: any) {
      // Non-critical: runtime config is still applied even if DB persist fails
    }

    return {
      success: true,
      config: this.llmService.getConfig(),
      persisted: true,
      warning: !wasAvailable
        ? `Provider "${config.defaultProvider}" is configured but NOT available (API key may be missing). Agents will fall back to heuristic data.`
        : undefined,
    };
  }

  @Put('switch-provider')
  @ApiOperation({ summary: 'Admin: Quick-switch the default LLM provider (persisted to DB)' })
  async switchProvider(@Body() dto: SwitchProviderDto) {
    const provider = this.llmService.getProvider(dto.provider);
    if (!provider) {
      return {
        success: false,
        error: `Provider "${dto.provider}" is not registered`,
      };
    }

    const wasAvailable = provider.isAvailable();

    // Apply runtime switch
    this.llmService.switchProvider(dto.provider);

    // Persist to database
    try {
      await this.creditService.updateSetting(
        'llm_default_provider',
        dto.provider,
        'Default LLM provider (zai, openai, or anthropic)',
      );
    } catch (error: any) {
      // Non-critical: runtime switch is still applied
    }

    return {
      success: true,
      config: this.llmService.getConfig(),
      persisted: true,
      warning: !wasAvailable
        ? `Provider "${dto.provider}" is configured but NOT available (API key may be missing). Agents will fall back to heuristic data.`
        : undefined,
    };
  }

  // ─── Cache Management ───────────────────────────────────────

  @Post('cache/invalidate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin: Invalidate LLM response cache' })
  async invalidateCache() {
    const count = this.llmService.invalidateCache();
    return {
      success: true,
      invalidatedEntries: count,
    };
  }

  @Get('cache/stats')
  @ApiOperation({ summary: 'Get LLM cache statistics' })
  async getCacheStats() {
    const stats = this.llmService.getCacheStats();
    return {
      cache: stats || { enabled: false },
    };
  }

  // ─── Health Check ────────────────────────────────────────────

  @Get('health')
  @ApiOperation({ summary: 'Quick LLM health check — is any provider available?' })
  async healthCheck() {
    const anyAvailable = this.llmService.isAnyAvailable();
    const config = this.llmService.getConfig();
    const defaultAvailable = this.llmService.getProvider(config.defaultProvider)?.isAvailable() ?? false;
    const fallbackAvailable = config.fallbackEnabled
      ? (this.llmService.getProvider(config.secondaryProvider)?.isAvailable() ?? false)
      : false;

    return {
      status: anyAvailable ? 'healthy' : 'degraded',
      defaultProvider: {
        name: config.defaultProvider,
        available: defaultAvailable,
      },
      fallback: config.fallbackEnabled
        ? {
            name: config.secondaryProvider,
            available: fallbackAvailable,
          }
        : null,
      recommendation: !anyAvailable
        ? 'No LLM provider is available. Configure an API key (OPENAI_API_KEY or ANTHROPIC_API_KEY) or ensure ZAI provider is initialized. Agents will use heuristic fallback data.'
        : !defaultAvailable
          ? `Default provider "${config.defaultProvider}" is unavailable. ${config.fallbackEnabled ? `Fallback provider "${config.secondaryProvider}" is ${fallbackAvailable ? 'available' : 'also unavailable'}.` : 'Fallback is not enabled.'} Consider switching to an available provider.`
          : 'All systems operational.',
    };
  }
}
