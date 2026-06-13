import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './entities/user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findAll(tenantId?: string, page = 1, limit = 20): Promise<{ data: User[]; total: number }> {
    const query = this.userRepository.createQueryBuilder('user');
    if (tenantId) query.andWhere('user.tenantId = :tenantId', { tenantId });
    query.skip((page - 1) * limit).take(limit);
    const [data, total] = await query.getManyAndCount();
    return { data, total };
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  async findByEmail(email: string): Promise<User> {
    return this.userRepository.findOne({ where: { email } });
  }

  async update(id: string, dto: Partial<User>): Promise<User> {
    await this.userRepository.update(id, dto);
    return this.findOne(id);
  }

  async updateRole(id: string, role: UserRole): Promise<User> {
    return this.update(id, { role });
  }

  async updatePassword(id: string, currentPassword: string, newPassword: string): Promise<User> {
    const user = await this.findOne(id);
    const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isPasswordValid) throw new Error('Current password is incorrect');

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);
    return this.update(id, { passwordHash });
  }

  async deactivate(id: string): Promise<User> {
    return this.update(id, { isActive: false });
  }

  async activate(id: string): Promise<User> {
    return this.update(id, { isActive: true });
  }
}
