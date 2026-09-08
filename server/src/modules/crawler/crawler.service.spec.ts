import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { CrawlerService } from './crawler.service';
import { CrawlJob } from './schemas/crawl-job.schema';
import { AiService } from '../ai/ai.service';
import { StorageService } from '../storage/storage.service';

jest.mock('playwright', () => ({
  chromium: {
    launch: jest.fn(),
  },
}));

describe('CrawlerService', () => {
  let service: CrawlerService;
  let model: any;
  let mockStorage: any;

  const mockJob = {
    _id: { toString: () => 'job-id' },
    userId: 'user-id',
    url: 'https://example.com',
    status: 'pending',
  };

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
    const mockModel = {
      create: jest.fn(),
      findById: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      countDocuments: jest.fn(),
      deleteOne: jest.fn(),
    };

    mockStorage = {
      upload: jest.fn().mockResolvedValue({
        publicId: 'job-id/screenshot.png',
        url: 'https://res.cloudinary.com/test/image/upload/job-id/screenshot.png',
      }),
      delete: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CrawlerService,
        { provide: getModelToken(CrawlJob.name), useValue: mockModel },
        {
          provide: AiService,
          useValue: {
            chat: jest.fn().mockResolvedValue({ overallAlignment: 75 }),
          },
        },
        { provide: StorageService, useValue: mockStorage },
      ],
    }).compile();

    service = module.get<CrawlerService>(CrawlerService);
    model = module.get(getModelToken(CrawlJob.name));
    mockStorage = module.get(StorageService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('startAnalysis', () => {
    it('creates a job with pending status and returns id', async () => {
      model.create.mockResolvedValue(mockJob);
      model.findByIdAndUpdate.mockReturnValue(mockQuery(undefined));

      const result = await service.startAnalysis(
        'user-id',
        'https://example.com',
      );

      expect(result).toBe('job-id');
      expect(model.create).toHaveBeenCalledWith({
        userId: 'user-id',
        url: 'https://example.com',
        status: 'pending',
      });
    });
  });

  describe('getJob', () => {
    it('returns a job by id', async () => {
      model.findById.mockReturnValue(mockQuery(mockJob));
      const result = await service.getJob('job-id');
      expect(result).toEqual(mockJob);
    });

    it('returns null if not found', async () => {
      model.findById.mockReturnValue(mockQuery(null));
      const result = await service.getJob('invalid-id');
      expect(result).toBeNull();
    });
  });

  describe('getUserJobs', () => {
    it('returns paginated jobs', async () => {
      model.find.mockReturnValue(mockSortQuery([mockJob]));
      model.countDocuments.mockResolvedValue(1);

      const result = await service.getUserJobs('user-id', 1, 10);
      expect(result.jobs).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('deleteJob', () => {
    it('deletes a job owned by the user', async () => {
      model.findOne.mockReturnValue(
        mockQuery({
          _id: 'job-id',
          userId: 'user-id',
          screenshotKey: 'screenshot-key',
        }),
      );
      model.deleteOne.mockReturnValue(mockQuery({ deletedCount: 1 }));

      const result = await service.deleteJob('job-id', 'user-id');
      expect(result).toBe(true);
      expect(mockStorage.delete).toHaveBeenCalledWith(
        'screenshot-key',
        'image',
      );
    });

    it('returns false if job not found', async () => {
      model.findOne.mockReturnValue(mockQuery(null));
      const result = await service.deleteJob('job-id', 'other-user');
      expect(result).toBe(false);
    });
  });
});
