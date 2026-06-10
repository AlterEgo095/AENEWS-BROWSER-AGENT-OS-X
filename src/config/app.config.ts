import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  name: process.env.APP_NAME || 'AENEWS-Agent-OS-X',
  version: process.env.APP_VERSION || '0.0.1',
  description:
    process.env.APP_DESCRIPTION ||
    'AENEWS Agent OS X - Enterprise Autonomous Browser Platform',
  port: parseInt(process.env.APP_PORT || '3000', 10),
  env: process.env.NODE_ENV || 'development',
}));
