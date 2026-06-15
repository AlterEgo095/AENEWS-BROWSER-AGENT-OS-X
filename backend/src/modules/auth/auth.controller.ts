import { Controller, Post, Delete, Body, Req, Res, Ip, Headers, HttpCode, HttpStatus, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiCookieAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto } from './dto';
import { Public } from './decorators/public.decorator';
import { Login2faDto } from '../security/dto/totp.dto';
import { setRefreshTokenCookie, clearRefreshTokenCookie, getRefreshTokenFromCookie } from './utils/cookie.helper';
import { Request, Response } from 'express';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiCookieAuth()
  async register(
    @Body() dto: RegisterDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.register(dto, { ip, userAgent });

    // Set refresh token as httpOnly cookie
    setRefreshTokenCookie(res, result.refreshToken);

    // Return only access token + user info in the response body
    return {
      user: result.user,
      accessToken: result.accessToken,
    };
  }

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Login with email and password (step 1 — may require 2FA)' })
  @ApiCookieAuth()
  async login(
    @Body() dto: LoginDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto, { ip, userAgent });

    // If 2FA is required, return the 2FA challenge without setting a cookie
    if ('requires2FA' in result) {
      return result;
    }

    // Set refresh token as httpOnly cookie
    setRefreshTokenCookie(res, result.refreshToken);

    // Return only access token + user info in the response body
    return {
      user: result.user,
      accessToken: result.accessToken,
    };
  }

  /**
   * Complete the second step of the 2FA login flow.
   *
   * Accepts the temporary token from login step 1 and a TOTP code
   * or backup code. On success, issues the real access + refresh tokens.
   */
  @Public()
  @Post('login/2fa')
  @ApiOperation({ summary: 'Complete 2FA login with temp token and TOTP code' })
  @ApiCookieAuth()
  async login2fa(
    @Body() dto: Login2faDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.loginStep2(dto.tempToken, dto.code, { ip, userAgent });

    // Set refresh token as httpOnly cookie
    setRefreshTokenCookie(res, result.refreshToken);

    // Return only access token + user info in the response body
    return {
      user: result.user,
      accessToken: result.accessToken,
    };
  }

  @Public()
  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token using refresh token from cookie' })
  @ApiCookieAuth()
  async refreshToken(
    @Req() req: Request,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Read refresh token from httpOnly cookie instead of request body
    const refreshToken = getRefreshTokenFromCookie(req);
    if (!refreshToken) {
      throw new UnauthorizedException('No refresh token provided');
    }

    const result = await this.authService.refreshAccessToken(refreshToken, { ip, userAgent });

    // Rotate: set new refresh token cookie
    setRefreshTokenCookie(res, result.refreshToken);

    // Return new access token in the response body
    return {
      accessToken: result.accessToken,
    };
  }

  @Post('logout')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Logout from current session' })
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Read refresh token from cookie and revoke it
    const refreshToken = getRefreshTokenFromCookie(req);
    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }

    // Clear the refresh cookie
    clearRefreshTokenCookie(res);
  }

  @Delete('logout-all')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Logout from all devices' })
  async logoutAll(
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logoutAll(req.user?.id);

    // Clear the refresh cookie
    clearRefreshTokenCookie(res);
  }
}
