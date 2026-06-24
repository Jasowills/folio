import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { UsersService } from './users.service';
import { User } from './schemas/user.schema';

const mockUser = {
  _id: 'user-id',
  email: 'test@example.com',
  name: 'Test User',
  googleId: 'google-id',
  avatar: 'https://example.com/avatar.png',
  refreshTokenHash: 'hashed-token',
};

describe('UsersService', () => {
  let service: UsersService;
  let model: any;

  const mockUserModel = {
    findOne: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    create: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getModelToken(User.name), useValue: mockUserModel },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    model = module.get(getModelToken(User.name));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findByEmail', () => {
    it('returns a user if found', async () => {
      model.findOne.mockReturnValue({ exec: () => mockUser });
      const result = await service.findByEmail('test@example.com');
      expect(result).toEqual(mockUser);
      expect(model.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
    });

    it('returns null if not found', async () => {
      model.findOne.mockReturnValue({ exec: () => null });
      const result = await service.findByEmail('missing@example.com');
      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('returns a user by id', async () => {
      model.findById.mockReturnValue({ exec: () => mockUser });
      const result = await service.findById('user-id');
      expect(result).toEqual(mockUser);
      expect(model.findById).toHaveBeenCalledWith('user-id');
    });

    it('returns null if not found', async () => {
      model.findById.mockReturnValue({ exec: () => null });
      const result = await service.findById('invalid-id');
      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('creates and returns a user', async () => {
      model.create.mockResolvedValue(mockUser);
      const result = await service.create({ email: 'test@example.com' });
      expect(result).toEqual(mockUser);
      expect(model.create).toHaveBeenCalledWith({ email: 'test@example.com' });
    });
  });

  describe('updateRefreshToken', () => {
    it('updates the refresh token hash', async () => {
      model.findByIdAndUpdate.mockResolvedValue(undefined);
      await service.updateRefreshToken('user-id', 'new-hash');
      expect(model.findByIdAndUpdate).toHaveBeenCalledWith('user-id', {
        refreshTokenHash: 'new-hash',
      });
    });

    it('clears the refresh token hash when null', async () => {
      model.findByIdAndUpdate.mockResolvedValue(undefined);
      await service.updateRefreshToken('user-id', null);
      expect(model.findByIdAndUpdate).toHaveBeenCalledWith('user-id', {
        refreshTokenHash: null,
      });
    });
  });
});
