import {
  Controller,
  Get,
  Post,
  Put,
  Query,
  Body,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CreditService } from './credit.service';
import { IsString, IsInt, IsOptional, IsNotEmpty, Min } from 'class-validator';
import { Type } from 'class-transformer';

// ─── DTOs ──────────────────────────────────────────────────────

class DeductCreditsDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  amount: number;

  @IsOptional()
  @IsString()
  agentId?: string;

  @IsOptional()
  @IsString()
  missionId?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

class AdminAddCreditsDto {
  @IsString()
  @IsNotEmpty()
  targetUserId: string;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  amount: number;

  @IsOptional()
  @IsString()
  description?: string;
}

class AdminDeductCreditsDto {
  @IsString()
  @IsNotEmpty()
  targetUserId: string;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  amount: number;

  @IsOptional()
  @IsString()
  description?: string;
}

class UpdateSettingDto {
  @IsString()
  @IsNotEmpty()
  key: string;

  @IsString()
  @IsNotEmpty()
  value: string;

  @IsOptional()
  @IsString()
  description?: string;
}

// ─── Controller ────────────────────────────────────────────────

@ApiTags('Credits')
@ApiBearerAuth()
@Controller('credits')
export class CreditController {
  constructor(private readonly creditService: CreditService) {}

  // ─── User Endpoints ──────────────────────────────────────────

  @Get('balance')
  @ApiOperation({ summary: 'Get user credit balance and transaction history' })
  async getBalance(@Query('userId') userId: string) {
    if (!userId) {
      return { error: 'userId query parameter is required' };
    }
    return this.creditService.getBalance(userId);
  }

  @Get('packages')
  @ApiOperation({ summary: 'Get available credit packages' })
  async getPackages() {
    const packages = await this.creditService.getCreditPackages();
    return { packages };
  }

  @Get('whatsapp-number')
  @ApiOperation({ summary: 'Get WhatsApp number for credit ordering' })
  async getWhatsAppNumber() {
    const whatsappNumber = await this.creditService.getWhatsAppNumber();
    return { whatsappNumber };
  }

  @Get('order')
  @ApiOperation({ summary: 'Get combined order info (packages + WhatsApp number)' })
  async getOrderInfo() {
    const whatsappNumber = await this.creditService.getWhatsAppNumber();
    const packages = await this.creditService.getCreditPackages();

    const message = 'Bonjour, je souhaite commander des crédits AENEWS Agent OS X.';
    const whatsappUrl = `https://wa.me/${whatsappNumber.replace(/[^0-9+]/g, '')}?text=${encodeURIComponent(message)}`;

    return {
      whatsappNumber,
      packages,
      message,
      whatsappUrl,
    };
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Get transaction history for a user' })
  async getTransactions(
    @Query('userId') userId: string,
    @Query('limit') limit?: string,
  ) {
    if (!userId) {
      return { error: 'userId query parameter is required' };
    }
    const parsedLimit = limit ? parseInt(limit, 10) : 50;
    const transactions = await this.creditService.getTransactions(userId, parsedLimit);
    return { transactions };
  }

  // ─── Agent Execution Endpoint ────────────────────────────────

  @Post('deduct')
  @ApiOperation({ summary: 'Deduct credits (called by agent execution)' })
  async deductCredits(@Body() dto: DeductCreditsDto) {
    const result = await this.creditService.deductCredits(
      dto.userId,
      dto.amount,
      dto.agentId,
      dto.missionId,
      dto.description,
    );
    return {
      success: true,
      newBalance: result.account.balance,
      transaction: {
        id: result.transaction.id,
        amount: result.transaction.amount,
        type: result.transaction.type,
        description: result.transaction.description,
        createdAt: result.transaction.createdAt,
      },
    };
  }

  // ─── Admin Endpoints ─────────────────────────────────────────

  @Post('admin/add')
  @ApiOperation({ summary: 'Admin: Add credits to user account' })
  async adminAddCredits(@Body() dto: AdminAddCreditsDto) {
    // In a real implementation, the adminId would come from the JWT token
    const adminId = 'admin';
    const result = await this.creditService.addCreditsByAdmin(
      dto.targetUserId,
      dto.amount,
      dto.description || `Admin added ${dto.amount} credits`,
      adminId,
    );
    return {
      success: true,
      newBalance: result.account.balance,
      transaction: {
        id: result.transaction.id,
        amount: result.transaction.amount,
        type: result.transaction.type,
        description: result.transaction.description,
        createdAt: result.transaction.createdAt,
      },
    };
  }

  @Post('admin/deduct')
  @ApiOperation({ summary: 'Admin: Deduct credits from user account' })
  async adminDeductCredits(@Body() dto: AdminDeductCreditsDto) {
    const adminId = 'admin';
    const result = await this.creditService.deductCreditsByAdmin(
      dto.targetUserId,
      dto.amount,
      dto.description || `Admin deducted ${dto.amount} credits`,
      adminId,
    );
    return {
      success: true,
      newBalance: result.account.balance,
      transaction: {
        id: result.transaction.id,
        amount: result.transaction.amount,
        type: result.transaction.type,
        description: result.transaction.description,
        createdAt: result.transaction.createdAt,
      },
    };
  }

  @Get('admin/accounts')
  @ApiOperation({ summary: 'Admin: List all credit accounts' })
  async adminGetAllAccounts() {
    const accounts = await this.creditService.getAllAccounts();
    return { accounts };
  }

  @Get('admin/settings')
  @ApiOperation({ summary: 'Admin: Get all settings' })
  async adminGetSettings() {
    const settings = await this.creditService.getAdminSettings();
    const settingsMap: Record<string, { value: string; description: string | null; createdAt: Date }> = {};
    for (const s of settings) {
      settingsMap[s.key] = {
        value: s.value,
        description: s.description,
        createdAt: s.createdAt,
      };
    }
    return { settings: settingsMap };
  }

  @Put('admin/settings')
  @ApiOperation({ summary: 'Admin: Update a setting' })
  async adminUpdateSetting(@Body() dto: UpdateSettingDto) {
    const setting = await this.creditService.updateSetting(dto.key, dto.value, dto.description);
    return {
      success: true,
      setting: {
        key: setting.key,
        value: setting.value,
        description: setting.description,
      },
    };
  }
}
