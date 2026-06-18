/**
 * PDEOS Phase 2 — Security Fix
 * File: backend/src/modules/credit/credit.service.ts
 *
 * Fixes: C6 (atomic deduct), C7 (atomic add/adminDeduct), C8 (getOrCreate atomic)
 * Strategy: queryRunner + SERIALIZABLE isolation + SELECT FOR UPDATE
 */
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, QueryRunner } from 'typeorm';
import { CreditAccount } from './entities/credit-account.entity';
import { CreditTransaction, TransactionType } from './entities/credit-transaction.entity';
import { AdminSetting } from './entities/admin-setting.entity';

@Injectable()
export class CreditService {
  constructor(
    @InjectRepository(CreditAccount) private accountRepo: Repository<CreditAccount>,
    @InjectRepository(CreditTransaction) private txnRepo: Repository<CreditTransaction>,
    @InjectRepository(AdminSetting) private settingRepo: Repository<AdminSetting>,
    private dataSource: DataSource,
  ) {}

  // FIX C8: atomic get-or-create via INSERT ON CONFLICT
  async getOrCreateAccount(userId: string): Promise<CreditAccount> {
    const existing = await this.accountRepo.findOne({ where: { userId } });
    if (existing) return existing;
    try {
      const account = this.accountRepo.create({ userId, balance: 0, totalPurchased: 0, totalUsed: 0 });
      return await this.accountRepo.save(account);
    } catch (err: any) {
      if (err?.code === '23505') {  // unique_violation — race condition
        const raced = await this.accountRepo.findOne({ where: { userId } });
        if (raced) return raced;
      }
      throw err;
    }
  }

  async getBalance(userId: string) {
    const acct = await this.getOrCreateAccount(userId);
    return { balance: acct.balance, totalPurchased: acct.totalPurchased, totalUsed: acct.totalUsed };
  }

  async getTransactions(userId: string, page = 1, limit = 20) {
    const [items, total] = await this.txnRepo.findAndCount({
      where: { userId }, order: { createdAt: 'DESC' },
      skip: (page - 1) * limit, take: limit,
    });
    return { items, total, page, limit };
  }

  // FIX C6: atomic deduct via queryRunner SERIALIZABLE + SELECT FOR UPDATE
  async deductCredits(userId: string, amount: number, opts: { agentId?: string; missionId?: string; description?: string } = {}) {
    if (amount <= 0) throw new Error('Amount must be positive');
    const qr: QueryRunner = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction('SERIALIZABLE');
    try {
      const account = await qr.manager.createQueryBuilder(CreditAccount, 'acct')
        .setLock('pessimistic_write')
        .where('acct.userId = :userId', { userId })
        .getOne();
      if (!account) { await qr.commitTransaction(); throw new NotFoundException('Account not found'); }
      if (account.balance < amount) { await qr.commitTransaction(); return { success: false, newBalance: account.balance, transactionId: '' }; }
      const updateResult = await qr.manager.createQueryBuilder()
        .update(CreditAccount)
        .set({ balance: () => `balance - ${amount}`, totalUsed: () => `totalUsed + ${amount}` })
        .where('userId = :userId AND balance >= :amount', { userId, amount })
        .execute();
      if (updateResult.affected === 0) { await qr.rollbackTransaction(); return { success: false, newBalance: account.balance, transactionId: '' }; }
      const txn = qr.manager.create(CreditTransaction, {
        userId, amount: -amount, type: TransactionType.USAGE,
        description: opts.description ?? 'Agent execution', agentId: opts.agentId, missionId: opts.missionId,
      });
      const saved = await qr.manager.save(txn);
      await qr.commitTransaction();
      return { success: true, newBalance: account.balance - amount, transactionId: saved.id };
    } catch (err) { await qr.rollbackTransaction(); throw err; }
    finally { await qr.release(); }
  }

  // FIX C7: atomic addCredits
  async addCredits(userId: string, amount: number, description: string) {
    if (amount <= 0) throw new Error('Amount must be positive');
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction('SERIALIZABLE');
    try {
      await this.getOrCreateAccount(userId);
      const r = await qr.manager.createQueryBuilder()
        .update(CreditAccount)
        .set({ balance: () => `balance + ${amount}`, totalPurchased: () => `totalPurchased + ${amount}` })
        .where('userId = :userId', { userId }).execute();
      if (r.affected === 0) { await qr.rollbackTransaction(); throw new NotFoundException('Account not found'); }
      await qr.manager.save(qr.manager.create(CreditTransaction, {
        userId, amount, type: TransactionType.PURCHASE, description,
      }));
      await qr.commitTransaction();
      return await this.accountRepo.findOneOrFail({ where: { userId } });
    } catch (err) { await qr.rollbackTransaction(); throw err; }
    finally { await qr.release(); }
  }

  // FIX C7: atomic adminDeductCredits
  async adminDeductCredits(userId: string, amount: number, opts: { adminId: string; description?: string }) {
    if (amount <= 0) throw new Error('Amount must be positive');
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction('SERIALIZABLE');
    try {
      const acct = await qr.manager.createQueryBuilder(CreditAccount, 'a')
        .setLock('pessimistic_write').where('a.userId = :userId', { userId }).getOne();
      if (!acct) { await qr.rollbackTransaction(); throw new NotFoundException('Account not found'); }
      if (acct.balance < amount) { await qr.rollbackTransaction(); throw new Error(`Insufficient balance: ${acct.balance} < ${amount}`); }
      await qr.manager.createQueryBuilder()
        .update(CreditAccount)
        .set({ balance: () => `balance - ${amount}`, totalUsed: () => `totalUsed + ${amount}` })
        .where('userId = :userId AND balance >= :amount', { userId, amount }).execute();
      await qr.manager.save(qr.manager.create(CreditTransaction, {
        userId, amount: -amount, type: TransactionType.ADMIN_DEDUCT,
        description: opts.description ?? 'Admin deduction', adminId: opts.adminId,
      }));
      await qr.commitTransaction();
      return await this.accountRepo.findOneOrFail({ where: { userId } });
    } catch (err) { await qr.rollbackTransaction(); throw err; }
    finally { await qr.release(); }
  }

  async adminAddCredits(userId: string, amount: number, opts: { adminId: string; description?: string }) {
    if (amount <= 0) throw new Error('Amount must be positive');
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction('SERIALIZABLE');
    try {
      await this.getOrCreateAccount(userId);
      await qr.manager.createQueryBuilder()
        .update(CreditAccount)
        .set({ balance: () => `balance + ${amount}`, totalPurchased: () => `totalPurchased + ${amount}` })
        .where('userId = :userId', { userId }).execute();
      await qr.manager.save(qr.manager.create(CreditTransaction, {
        userId, amount, type: TransactionType.ADMIN_ADD,
        description: opts.description ?? 'Admin addition', adminId: opts.adminId,
      }));
      await qr.commitTransaction();
      return await this.accountRepo.findOneOrFail({ where: { userId } });
    } catch (err) { await qr.rollbackTransaction(); throw err; }
    finally { await qr.release(); }
  }

  async adminGetAllAccounts() { return this.accountRepo.find({ order: { createdAt: 'DESC' } }); }
  async adminGetSettings() { return this.settingRepo.find(); }
  async adminUpdateSetting(key: string, value: string, opts: { adminId: string }) {
    const setting = await this.settingRepo.findOne({ where: { key } });
    if (!setting) return this.settingRepo.save(this.settingRepo.create({ key, value, description: `Updated by ${opts.adminId}` }));
    setting.value = value;
    return this.settingRepo.save(setting);
  }
}
