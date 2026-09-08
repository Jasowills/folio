import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import * as jwt from 'jsonwebtoken';
import type { Response, Request } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { AuthService } from './auth.service';
import { GoogleLoginDto, EmailLoginDto, SignupDto } from './dto/login.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { UserDocument } from '../users/schemas/user.schema';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {
    (OAuth2Client as any).CLOCK_SKEW_SECS_ = 600;
  }

  @ApiOperation({ summary: 'Get Google OAuth client ID' })
  @Get('google-client-id')
  getGoogleClientId() {
    return { clientId: process.env.GOOGLE_CLIENT_ID };
  }

  @Post('debug-verify')
  async debugVerify(@Body() body: { token: string }) {
    if (process.env.NODE_ENV === 'production') {
      throw new UnauthorizedException('Not available in production');
    }
    try {
      const secret = process.env.JWT_SECRET;
      if (!secret) throw new Error('JWT_SECRET not set');
      const decoded = jwt.verify(body.token, secret);
      return { valid: true, decoded };
    } catch (err: any) {
      return { valid: false, error: err.message };
    }
  }

  @ApiOperation({ summary: 'Login with Google credential' })
  @Post('google')
  @HttpCode(HttpStatus.OK)
  async googleLogin(
    @Body() dto: GoogleLoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    console.log('[auth/google] credential length:', dto.credential?.length);
    const profile = await this.verifyGoogleToken(dto.credential);
    const tokens = await this.authService.googleLogin(profile);
    this.setRefreshCookie(res, tokens.refreshToken);
    return { accessToken: tokens.accessToken, user: tokens.user };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Link Google account to existing user' })
  @Post('google/link')
  @HttpCode(HttpStatus.OK)
  async linkGoogle(
    @CurrentUser() user: UserDocument,
    @Body() dto: GoogleLoginDto,
  ) {
    const profile = await this.verifyGoogleToken(dto.credential);
    return this.authService.linkGoogle(user._id.toString(), profile);
  }

  @ApiOperation({ summary: 'Login with email and password' })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async emailLogin(
    @Body() dto: EmailLoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.authService.emailLogin(dto);
    this.setRefreshCookie(res, tokens.refreshToken);
    return { accessToken: tokens.accessToken, user: tokens.user };
  }

  @ApiOperation({ summary: 'Create account with email and password' })
  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  async signup(
    @Body() dto: SignupDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.authService.signup(dto);
    this.setRefreshCookie(res, tokens.refreshToken);
    return { accessToken: tokens.accessToken, user: tokens.user };
  }

  @ApiOperation({ summary: 'Refresh access token' })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = req.cookies?.refreshToken;
    if (!token) throw new UnauthorizedException('No refresh token');
    const tokens = await this.authService.refreshTokens(token);
    this.setRefreshCookie(res, tokens.refreshToken);
    return { accessToken: tokens.accessToken, user: tokens.user };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current user profile' })
  @Get('me')
  getMe(@CurrentUser() user: UserDocument) {
    return {
      _id: user._id,
      email: user.email,
      name: user.name,
      picture: user.avatar,
      googleId: user.googleId || null,
      hasPassword: !!user.password,
    };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Logout user' })
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser() user: UserDocument,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logout(user._id.toString());
    res.clearCookie('refreshToken', { path: '/api/auth' });
    return { message: 'Logged out' };
  }

  private setRefreshCookie(res: Response, token: string) {
    res.cookie('refreshToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/auth',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

  private googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

  private async verifyGoogleToken(credential: string) {
    try {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      console.log('[auth] verifyGoogleToken', {
        clientId,
        credentialLength: credential?.length,
      });
      const ticket = await this.googleClient.verifyIdToken({
        idToken: credential,
        audience: clientId,
      });
      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        throw new Error('Google token missing email');
      }
      return {
        email: payload.email,
        name: payload.name || '',
        googleId: payload.sub,
        avatar: payload.picture || '',
      };
    } catch (err: any) {
      console.error('[auth] verifyGoogleToken error:', err.message, err.stack);
      throw new UnauthorizedException('Invalid Google credential');
    }
  }
}
