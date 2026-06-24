import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let usersService: any;
  let jwtService: any;

  const mockUser = {
    _id: { toString: () => 'user-id' },
    email: 'test@example.com',
    name: 'Test User',
    refreshTokenHash: 'hashed-refresh-token',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            findByEmail: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            updateRefreshToken: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
            verify: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('googleLogin', () => {
    const profile = {
      email: 'new@example.com',
      name: 'New User',
      googleId: 'google-id',
      avatar: 'https://example.com/avatar.png',
    };

    it('creates a new user and returns tokens', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      usersService.create.mockResolvedValue(mockUser);
      jwtService.sign
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-refresh-token');

      const result = await service.googleLogin(profile);

      expect(usersService.findByEmail).toHaveBeenCalledWith(profile.email);
      expect(usersService.create).toHaveBeenCalledWith(profile);
      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
    });

    it('returns tokens for existing user', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);
      jwtService.sign
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-refresh-token');

      const result = await service.googleLogin(profile);

      expect(usersService.findByEmail).toHaveBeenCalledWith(profile.email);
      expect(usersService.create).not.toHaveBeenCalled();
      expect(result.accessToken).toBe('access-token');
    });
  });

  describe('refreshTokens', () => {
    it('rotates tokens when valid', async () => {
      jwtService.verify.mockReturnValue({ sub: 'user-id' });
      usersService.findById.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwtService.sign
        .mockReturnValueOnce('new-access-token')
        .mockReturnValueOnce('new-refresh-token');
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hash');

      const result = await service.refreshTokens('valid-refresh-token');

      expect(result.accessToken).toBe('new-access-token');
      expect(result.refreshToken).toBe('new-refresh-token');
      expect(usersService.updateRefreshToken).toHaveBeenCalledWith(
        'user-id',
        'new-hash',
      );
    });

    it('throws if refresh token is invalid', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('invalid token');
      });

      await expect(
        service.refreshTokens('bad-token'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws if user is not found', async () => {
      jwtService.verify.mockReturnValue({ sub: 'user-id' });
      usersService.findById.mockResolvedValue(null);

      await expect(
        service.refreshTokens('valid-token-no-user'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws if stored hash is missing', async () => {
      jwtService.verify.mockReturnValue({ sub: 'user-id' });
      usersService.findById.mockResolvedValue({
        ...mockUser,
        refreshTokenHash: null,
      });

      await expect(
        service.refreshTokens('valid-token-no-hash'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws if hashes do not match', async () => {
      jwtService.verify.mockReturnValue({ sub: 'user-id' });
      usersService.findById.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.refreshTokens('valid-token-wrong-hash'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('clears the refresh token', async () => {
      await service.logout('user-id');
      expect(usersService.updateRefreshToken).toHaveBeenCalledWith(
        'user-id',
        null,
      );
    });
  });
});
