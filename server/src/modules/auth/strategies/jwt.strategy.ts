import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private usersService: UsersService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET || 'fallback-secret',
    });
  }

  async validate(payload: { sub: string }) {
    try {
      console.log('[JwtStrategy] validate called', { sub: payload.sub });
      const user = await this.usersService.findById(payload.sub);
      if (!user) {
        console.error('[JwtStrategy] user not found for sub:', payload.sub);
        throw new UnauthorizedException();
      }
      return user;
    } catch (err) {
      console.error('[JwtStrategy] validate error:', err);
      throw new UnauthorizedException();
    }
  }
}
