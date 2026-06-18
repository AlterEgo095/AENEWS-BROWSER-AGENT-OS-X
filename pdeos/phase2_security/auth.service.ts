/**
 * PDEOS Phase 2 — Security Fix
 * File: backend/src/modules/auth/auth.service.ts (register method patch)
 * Fix H2: role = VIEWER (was TENANT_ADMIN)
 */
import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../user/entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.userRepo.findOne({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.password, salt);

    // FIX H2: role = VIEWER (was TENANT_ADMIN)
    const user = this.userRepo.create({
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      role: UserRole.VIEWER,
      isActive: true,
      totpEnabled: false,
    });
    const saved = await this.userRepo.save(user);

    const accessToken = await this.jwtService.signAsync({
      sub: saved.id, email: saved.email, role: saved.role,
    });
    const refreshToken = await this.jwtService.signAsync(
      { sub: saved.id, type: 'refresh' }, { expiresIn: '7d' },
    );
    return { user: saved, accessToken, refreshToken };
  }
}
