import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  NotFoundException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service';
import { UpdateProfileDto, ChangePasswordDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { UserDocument } from './schemas/user.schema';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

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

  @ApiOperation({ summary: 'Update profile' })
  @Patch('me')
  async updateProfile(
    @CurrentUser() user: UserDocument,
    @Body() dto: UpdateProfileDto,
  ) {
    if (dto.email && dto.email !== user.email) {
      const existing = await this.usersService.findByEmail(dto.email);
      if (existing) {
        throw new ConflictException('Email already in use');
      }
    }
    const updated = await this.usersService.updateUser(
      user._id.toString(),
      dto,
    );
    return {
      _id: updated._id,
      email: updated.email,
      name: updated.name,
      picture: updated.avatar,
      googleId: updated.googleId || null,
      hasPassword: !!updated.password,
    };
  }

  @ApiOperation({ summary: 'Change password' })
  @Post('me/change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentUser() user: UserDocument,
    @Body() dto: ChangePasswordDto,
  ) {
    if (!user.password) {
      throw new UnauthorizedException(
        'Cannot change password for Google-authenticated accounts',
      );
    }
    const isValid = await bcrypt.compare(dto.currentPassword, user.password);
    if (!isValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }
    await this.usersService.changePassword(
      user._id.toString(),
      dto.newPassword,
    );
    return { message: 'Password updated' };
  }

  @ApiOperation({ summary: 'Delete account' })
  @Delete('me')
  @HttpCode(HttpStatus.OK)
  async deleteAccount(@CurrentUser() user: UserDocument) {
    await this.usersService.deleteAccount(user._id.toString());
    return { message: 'Account deleted' };
  }
}
