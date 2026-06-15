import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CreditAccount,
  CreditTransaction,
  CreditTransactionType,
  AdminSetting,
} from './entities/credit.entity';

// ─── Default Settings ──────────────────────────────────────────

const DEFAULT_CREDIT_PACKAGES = [
  { id: 'starter', name: 'Starter', credits: 100, price: 5 },
  { id: 'pro', name: 'Pro', credits: 500, price: 20, popular: true },
  { id: 'enterprise', name: 'Enterprise', credits: 2000, price: 50 },
];

const DEFAULT_SETTINGS: Record<string, { value: string; description: string }> = {
  whatsapp_number: {
    value: '+243816515095',
    description: 'WhatsApp number for credit orders',
  },
  credit_packages: {
    value: JSON.stringify(DEFAULT_CREDIT_PACKAGES),
    description: 'Available credit packages (JSON array)',
  },
};

// ─── Service ───────────────────────────────────────────────────

@Injectable()
export class CreditService {
  private readonly logger = new Logger(CreditService.name);

  constructor(
    @InjectRepository(CreditAccount)
    private readonly accountRepo: Repository<CreditAccount>,
    @InjectRepository(CreditTransaction)
    private readonly transactionRepo: Repository<CreditTransaction>,
    @InjectRepository(AdminSetting)
    private readonly settingRepo: Repository<AdminSetting>,
  ) {}

  // ─── Account Management ──────────────────────────────────────

  /**
   * Get or create a credit account for a user.
   * If the account doesn't exist, it will be created with zero balance.
   */
  async getOrCreateAccount(userId: string): Promise<CreditAccount> {
    let account = await this.accountRepo.findOne({ where: { userId } });
    if (!account) {
      account = this.accountRepo.create({ userId, balance: 0, totalPurchased: 0, totalUsed: 0 });
      account = await this.accountRepo.save(account);
      this.logger.log(`Created credit account for user ${userId}`);
    }
    return account;
  }

  /**
   * Get a user's credit balance along with transaction history.
   */
  async getBalance(userId: string, transactionLimit = 50): Promise<{
    balance: number;
    totalUsed: number;
    totalPurchased: number;
    transactions: CreditTransaction[];
  }> {
    const account = await this.getOrCreateAccount(userId);
    const transactions = await this.transactionRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: transactionLimit,
    });

    return {
      balance: account.balance,
      totalUsed: account.totalUsed,
      totalPurchased: account.totalPurchased,
      transactions,
    };
  }

  // ─── Credit Operations ───────────────────────────────────────

  /**
   * Add credits to a user's account and record the transaction.
   */
  async addCredits(
    userId: string,
    amount: number,
    type: CreditTransactionType,
    description: string,
    adminId?: string,
    agentId?: string,
    missionId?: string,
  ): Promise<{ account: CreditAccount; transaction: CreditTransaction }> {
    const account = await this.getOrCreateAccount(userId);

    account.balance += amount;
    if (type === 'purchase' || type === 'admin_add' || type === 'bonus') {
      account.totalPurchased += amount;
    }

    const savedAccount = await this.accountRepo.save(account);

    const transaction = this.transactionRepo.create({
      userId,
      amount,
      type,
      description: description || '',
      adminId: adminId || undefined,
      agentId: agentId || undefined,
      missionId: missionId || undefined,
    });
    const savedTransaction = await this.transactionRepo.save(transaction);

    this.logger.log(
      `Added ${amount} credits to user ${userId} (type=${type}): ${description}`,
    );

    return { account: savedAccount, transaction: savedTransaction };
  }

  /**
   * Deduct credits from a user's account if sufficient balance exists.
   * Throws an error if the user has insufficient credits.
   */
  async deductCredits(
    userId: string,
    amount: number,
    agentId?: string,
    missionId?: string,
    description?: string,
  ): Promise<{ account: CreditAccount; transaction: CreditTransaction }> {
    const account = await this.getOrCreateAccount(userId);

    if (account.balance < amount) {
      throw new Error(
        `Insufficient credits. User ${userId} has ${account.balance} credits but needs ${amount}.`,
      );
    }

    account.balance -= amount;
    account.totalUsed += amount;

    const savedAccount = await this.accountRepo.save(account);

    const transaction = this.transactionRepo.create({
      userId,
      amount: -amount,
      type: 'usage',
      description: description || `Deducted ${amount} credits`,
      agentId: agentId || undefined,
      missionId: missionId || undefined,
    });
    const savedTransaction = await this.transactionRepo.save(transaction);

    this.logger.log(
      `Deducted ${amount} credits from user ${userId}: ${description || 'Agent usage'}`,
    );

    return { account: savedAccount, transaction: savedTransaction };
  }

  /**
   * Check if a user has enough credits for an operation.
   */
  async hasCredits(userId: string, amount: number): Promise<boolean> {
    const account = await this.accountRepo.findOne({ where: { userId } });
    if (!account) return false;
    return account.balance >= amount;
  }

  /**
   * Get a user's transaction history.
   */
  async getTransactions(userId: string, limit = 50): Promise<CreditTransaction[]> {
    return this.transactionRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  // ─── Admin Settings ──────────────────────────────────────────

  /**
   * Get all admin settings, seeding defaults if needed.
   */
  async getAdminSettings(): Promise<AdminSetting[]> {
    await this.seedDefaultSettings();
    return this.settingRepo.find({ order: { key: 'ASC' } });
  }

  /**
   * Get a specific setting by key.
   */
  async getSetting(key: string): Promise<string | null> {
    const setting = await this.settingRepo.findOne({ where: { key } });
    return setting?.value ?? null;
  }

  /**
   * Update or create a setting.
   */
  async updateSetting(key: string, value: string, description?: string): Promise<AdminSetting> {
    let setting = await this.settingRepo.findOne({ where: { key } });
    if (setting) {
      setting.value = value;
      if (description !== undefined) {
        setting.description = description;
      }
    } else {
      setting = this.settingRepo.create({ key, value, description: description || undefined });
    }
    return this.settingRepo.save(setting);
  }

  /**
   * Get the WhatsApp number from settings.
   */
  async getWhatsAppNumber(): Promise<string> {
    const value = await this.getSetting('whatsapp_number');
    return value || '+243816515095';
  }

  /**
   * Get the credit packages from settings.
   */
  async getCreditPackages(): Promise<typeof DEFAULT_CREDIT_PACKAGES> {
    const value = await this.getSetting('credit_packages');
    if (!value) return DEFAULT_CREDIT_PACKAGES;
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      return DEFAULT_CREDIT_PACKAGES;
    } catch {
      return DEFAULT_CREDIT_PACKAGES;
    }
  }

  // ─── Admin Operations ────────────────────────────────────────

  /**
   * Get all credit accounts (admin view).
   */
  async getAllAccounts(): Promise<CreditAccount[]> {
    return this.accountRepo.find({ order: { createdAt: 'DESC' } });
  }

  /**
   * Admin adds credits to a user's account.
   */
  async addCreditsByAdmin(
    targetUserId: string,
    amount: number,
    description: string,
    adminId: string,
  ): Promise<{ account: CreditAccount; transaction: CreditTransaction }> {
    return this.addCredits(targetUserId, amount, 'admin_add', description, adminId);
  }

  /**
   * Admin deducts credits from a user's account.
   */
  async deductCreditsByAdmin(
    targetUserId: string,
    amount: number,
    description: string,
    adminId: string,
  ): Promise<{ account: CreditAccount; transaction: CreditTransaction }> {
    const account = await this.getOrCreateAccount(targetUserId);

    if (account.balance < amount) {
      throw new Error(
        `Insufficient credits. User ${targetUserId} has ${account.balance} credits but admin wants to deduct ${amount}.`,
      );
    }

    account.balance -= amount;
    account.totalUsed += amount;

    const savedAccount = await this.accountRepo.save(account);

    const transaction = this.transactionRepo.create({
      userId: targetUserId,
      amount: -amount,
      type: 'admin_deduct',
      description,
      adminId,
    });
    const savedTransaction = await this.transactionRepo.save(transaction);

    this.logger.log(
      `Admin ${adminId} deducted ${amount} credits from user ${targetUserId}: ${description}`,
    );

    return { account: savedAccount, transaction: savedTransaction };
  }

  // ─── Private Helpers ─────────────────────────────────────────

  /**
   * Seed default settings if they don't exist yet.
   */
  private async seedDefaultSettings(): Promise<void> {
    for (const [key, config] of Object.entries(DEFAULT_SETTINGS)) {
      const existing = await this.settingRepo.findOne({ where: { key } });
      if (!existing) {
        const setting = this.settingRepo.create({
          key,
          value: config.value,
          description: config.description,
        });
        await this.settingRepo.save(setting);
        this.logger.log(`Seeded default setting: ${key}`);
      }
    }
  }
}
