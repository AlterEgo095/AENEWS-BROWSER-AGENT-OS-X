import { registerAs } from '@nestjs/config';

export const jwtConfig = registerAs('jwt', () => ({
  secret: process.env.JWT_SECRET || 'change-me-to-a-secure-random-string-in-production',
  expiration: process.env.JWT_EXPIRATION || '24h',
  refreshExpiration: process.env.JWT_REFRESH_EXPIRATION || '7d',
}));
