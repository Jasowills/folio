import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException } from '@nestjs/common';
import { UploadService } from './upload.service';
import { Upload } from './schemas/upload.schema';
import { StorageService } from '../storage/storage.service';

describe('UploadService', () => {
  let service: UploadService;
  let model: any;
  let storage: jest.Mocked<StorageService>;

  const mockFile = {
    originalname: 'resume.pdf',
    mimetype: 'application/pdf',
    size: 1024 * 500,
    buffer: Buffer.from('fake file content'),
  } as Express.Multer.File;

  function mockQuery(returnValue: any) {
    return { exec: jest.fn().mockResolvedValue(returnValue) };
  }

  function mockSortQuery(returnValue: any) {
    return {
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(returnValue),
    };
  }

  beforeEach(async () => {
    const mockUploadModel = {
      create: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      countDocuments: jest.fn(),
      deleteOne: jest.fn(),
    };

    const mockStorage = {
      upload: jest.fn().mockResolvedValue({
        publicId: 'test-id.pdf',
        url: 'https://res.cloudinary.com/test/image/upload/test-id.pdf',
      }),
      delete: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UploadService,
        { provide: getModelToken(Upload.name), useValue: mockUploadModel },
        { provide: StorageService, useValue: mockStorage },
      ],
    }).compile();

    service = module.get<UploadService>(UploadService);
    model = module.get(getModelToken(Upload.name));
    storage = module.get(StorageService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadFile', () => {
    it('uploads and persists a valid file', async () => {
      model.create.mockImplementation((data) =>
        Promise.resolve({ _id: 'upload-id', ...data }),
      );

      const result = await service.uploadFile('user-id', mockFile);

      expect(result.originalName).toBe('resume.pdf');
      expect(result.mimeType).toBe('application/pdf');
      expect(result.size).toBe(1024 * 500);
      expect(storage.upload).toHaveBeenCalledWith(
        mockFile.buffer,
        expect.objectContaining({ folder: 'folio-uploads', resourceType: 'raw' }),
      );
      expect(model.create).toHaveBeenCalledWith({
        userId: 'user-id',
        originalName: 'resume.pdf',
        key: expect.any(String),
        url: expect.stringContaining('cloudinary'),
        mimeType: 'application/pdf',
        size: 1024 * 500,
      });
    });

    it('rejects null file', async () => {
      await expect(
        service.uploadFile('user-id', null as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects disallowed mime type', async () => {
      const badFile = { ...mockFile, mimetype: 'image/png' };
      await expect(
        service.uploadFile('user-id', badFile as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects file over 5MB', async () => {
      const largeFile = { ...mockFile, size: 6 * 1024 * 1024 };
      await expect(
        service.uploadFile('user-id', largeFile as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getUserUploads', () => {
    it('returns paginated uploads', async () => {
      model.find.mockReturnValue(mockSortQuery([{ id: 'upload-1' }]));
      model.countDocuments.mockResolvedValue(1);

      const result = await service.getUserUploads('user-id', 1, 10);
      expect(result.uploads).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('deleteUpload', () => {
    it('deletes upload if owned by user', async () => {
      model.findOne.mockReturnValue(
        mockQuery({ _id: 'upload-id', userId: 'user-id', key: 'file-key' }),
      );
      model.deleteOne.mockReturnValue(mockQuery({ deletedCount: 1 }));

      const result = await service.deleteUpload('upload-id', 'user-id');
      expect(result).toBe(true);
      expect(storage.delete).toHaveBeenCalledWith('file-key', 'raw');
    });

    it('returns false if upload not found', async () => {
      model.findOne.mockReturnValue(mockQuery(null));
      const result = await service.deleteUpload('upload-id', 'other-user');
      expect(result).toBe(false);
    });
  });
});
