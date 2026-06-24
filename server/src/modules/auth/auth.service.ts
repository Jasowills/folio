import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { UserDocument } from '../users/schemas/user.schema';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async googleLogin(profile: {
    email: string;
    name?: string;
    googleId: string;
    avatar?: string;
  }) {
    console.log('[auth.service] googleLogin start:', profile.email);
    try {
      let user = await this.usersService.findByEmail(profile.email);
      console.log('[auth.service] findByEmail result:', !!user);
      if (!user) {
        user = await this.usersService.create(profile);
        console.log('[auth.service] created user:', !!user);
      }
      const result = await this.generateTokens(user);
      console.log('[auth.service] generateTokens success');
      return result;
    } catch (err) {
      console.error('[auth.service] googleLogin error:', err);
      throw err;
    }
  }

  async signup(dto: { email: string; password: string; name: string }) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }
    const hashedPassword = await bcrypt.hash(dto.password, 12);
    const user = await this.usersService.create({
      email: dto.email,
      name: dto.name,
      password: hashedPassword,
    });
    return this.generateTokens(user);
  }

  async emailLogin(dto: { email: string; password: string }) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const isValid = await bcrypt.compare(dto.password, user.password);
    if (!isValid) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return this.generateTokens(user);
  }

  async refreshTokens(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || 'refresh-secret',
      });
      const user = await this.usersService.findById(payload.sub);
      if (!user || !user.refreshTokenHash) {
        throw new UnauthorizedException();
      }
      const isValid = await bcrypt.compare(
        refreshToken,
        user.refreshTokenHash,
      );
      if (!isValid) throw new UnauthorizedException();
      return this.generateTokens(user);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string) {
    await this.usersService.updateRefreshToken(userId, null);
  }

  private async generateTokens(user: UserDocument) {
    const payload = { sub: user._id.toString(), email: user.email };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET || 'refresh-secret',
      expiresIn: '7d',
    });
    const hash = await bcrypt.hash(refreshToken, 10);
    await this.usersService.updateRefreshToken(user._id.toString(), hash);
    return { accessToken, refreshToken, user };
  }
}
