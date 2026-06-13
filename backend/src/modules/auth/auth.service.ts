import { Injectable, Logger, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../user/entities/user.entity';
import { Tenant } from '../tenant/entities/tenant.entity';
import { EventService } from '../event/event.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    private readonly jwtService: JwtService,
    private readonly eventService: EventService,
  ) {}

  async register(dto: { email: string; password: string; firstName: string; lastName: string; tenantSlug?: string }): Promise<{ user: User; access_token: string }> {
    const existing = await this.userRepository.findOne({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');

    let tenant: Tenant;
    if (dto.tenantSlug) {
      tenant = await this.tenantRepository.findOne({ where: { slug: dto.tenantSlug } });
      if (!tenant) throw new UnauthorizedException('Tenant not found');
    } else {
      // Auto-create tenant for new registration
      tenant = this.tenantRepository.create({
        name: `${dto.firstName}'s Organization`,
        slug: `${dto.firstName.toLowerCase()}-${Date.now()}`,
        plan: 'free',
      });
      tenant = await this.tenantRepository.save(tenant);
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.password, salt);

    const user = this.userRepository.create({
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      role: UserRole.TENANT_ADMIN,
      tenantId: tenant.id,
    });
    const saved = await this.userRepository.save(user);

    const token = this.generateToken(saved);

    await this.eventService.emit({
      type: 'user.registered',
      namespace: 'auth',
      payload: { userId: saved.id, email: saved.email, tenantId: saved.tenantId },
      source: 'AuthService',
      tenantId: saved.tenantId,
    });

    return { user: saved, access_token: token };
  }

  async login(dto: { email: string; password: string }): Promise<{ user: User; access_token: string }> {
    const user = await this.userRepository.findOne({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) throw new UnauthorizedException('Invalid credentials');

    if (!user.isActive) throw new UnauthorizedException('Account is disabled');

    // Update last login
    await this.userRepository.update(user.id, { lastLoginAt: new Date() });

    const token = this.generateToken(user);

    await this.eventService.emit({
      type: 'user.login',
      namespace: 'auth',
      payload: { userId: user.id, email: user.email },
      source: 'AuthService',
      tenantId: user.tenantId,
    });

    return { user, access_token: token };
  }

  async validateUser(payload: any): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: payload.sub } });
    if (!user || !user.isActive) return null;
    return user;
  }

  private generateToken(user: User): string {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    };
    return this.jwtService.sign(payload);
  }
}
