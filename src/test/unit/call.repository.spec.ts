import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { CallRepository } from '../../repositories/call.repository';
import { Call } from '../../entities/call.entity';

describe('CallRepository', () => {
  let repository: CallRepository;

  const mockDataSource = {
    createEntityManager: jest.fn(),
  };

  const mockEntityManager = {
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    mockDataSource.createEntityManager.mockReturnValue(mockEntityManager);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CallRepository,
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    repository = module.get<CallRepository>(CallRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createCall', () => {
    it('should create and save a new call', async () => {
      const callData = {
        callerId: 'caller123',
        recipientId: 'recipient456',
        status: 'initiated',
        metadata: { test: true },
      };

      const expectedCall = {
        id: 'uuid-123',
        ...callData,
        duration: null,
        createdAt: new Date(),
      } as Call;

      jest.spyOn(repository, 'create').mockReturnValue(expectedCall);
      jest.spyOn(repository, 'save').mockResolvedValue(expectedCall);

      const result = await repository.createCall(callData);

      expect(repository.create).toHaveBeenCalledWith(callData);
      expect(repository.save).toHaveBeenCalledWith(expectedCall);
      expect(result).toEqual(expectedCall);
    });

    it('should handle null metadata', async () => {
      const callData = {
        callerId: 'caller123',
        recipientId: 'recipient456',
        status: 'initiated',
      };

      const expectedCall = {
        id: 'uuid-123',
        ...callData,
        metadata: null,
        duration: null,
        createdAt: new Date(),
      } as Call;

      jest.spyOn(repository, 'create').mockReturnValue(expectedCall);
      jest.spyOn(repository, 'save').mockResolvedValue(expectedCall);

      const result = await repository.createCall(callData);

      expect(result.metadata).toBeNull();
    });
  });

  describe('findCallById', () => {
    it('should find a call by id', async () => {
      const callId = 'uuid-123';
      const expectedCall = {
        id: callId,
        callerId: 'caller123',
        recipientId: 'recipient456',
        status: 'completed',
        duration: null,
        metadata: null,
        createdAt: new Date(),
      } as Call;

      jest.spyOn(repository, 'findOne').mockResolvedValue(expectedCall as Call);

      const result = await repository.findCallById(callId);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: callId },
      });
      expect(result).toEqual(expectedCall);
    });

    it('should return null if call not found', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(null);

      const result = await repository.findCallById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('findAllCalls', () => {
    it('should return all calls sorted by createdAt DESC', async () => {
      const calls = [
        { id: '1', createdAt: new Date('2024-01-02') },
        { id: '2', createdAt: new Date('2024-01-01') },
      ];

      jest.spyOn(repository, 'find').mockResolvedValue(calls as Call[]);

      const result = await repository.findAllCalls();

      expect(repository.find).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(calls);
    });

    it('should return empty array if no calls', async () => {
      jest.spyOn(repository, 'find').mockResolvedValue([]);

      const result = await repository.findAllCalls();

      expect(result).toEqual([]);
    });
  });

  describe('updateCallStatus', () => {
    it('should update call status', async () => {
      const callId = 'uuid-123';
      const existingCall = {
        id: callId,
        status: 'initiated',
        callerId: 'caller123',
        recipientId: 'recipient456',
        createdAt: new Date(),
      };

      const updatedCall = {
        ...existingCall,
        status: 'completed',
      };

      jest.spyOn(repository, 'findCallById').mockResolvedValue(existingCall as Call);
      jest.spyOn(repository, 'save').mockResolvedValue(updatedCall as Call);

      const result = await repository.updateCallStatus(callId, 'completed');

      expect(repository.findCallById).toHaveBeenCalledWith(callId);
      expect(repository.save).toHaveBeenCalledWith({
        ...existingCall,
        status: 'completed',
      });
      expect(result).toEqual(updatedCall);
    });

    it('should return null if call not found', async () => {
      jest.spyOn(repository, 'findCallById').mockResolvedValue(null);
      const saveSpy = jest.spyOn(repository, 'save');

      const result = await repository.updateCallStatus('non-existent', 'completed');

      expect(result).toBeNull();
      expect(saveSpy).not.toHaveBeenCalled();
    });
  });

  describe('findCallsByStatus', () => {
    it('should find calls by status', async () => {
      const status = 'processing';
      const calls = [
        { id: '1', status, createdAt: new Date('2024-01-02') },
        { id: '2', status, createdAt: new Date('2024-01-01') },
      ];

      jest.spyOn(repository, 'find').mockResolvedValue(calls as Call[]);

      const result = await repository.findCallsByStatus(status);

      expect(repository.find).toHaveBeenCalledWith({
        where: { status },
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(calls);
    });
  });

  describe('findRecentCalls', () => {
    it('should find recent calls with default limit', async () => {
      const calls = Array(10)
        .fill(null)
        .map((_, i) => ({
          id: `${i}`,
          createdAt: new Date(),
        }));

      jest.spyOn(repository, 'find').mockResolvedValue(calls as Call[]);

      const result = await repository.findRecentCalls();

      expect(repository.find).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
        take: 10,
      });
      expect(result).toHaveLength(10);
    });

    it('should find recent calls with custom limit', async () => {
      const calls = Array(5)
        .fill(null)
        .map((_, i) => ({
          id: `${i}`,
          createdAt: new Date(),
        }));

      jest.spyOn(repository, 'find').mockResolvedValue(calls as Call[]);

      const result = await repository.findRecentCalls(5);

      expect(repository.find).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
        take: 5,
      });
      expect(result).toHaveLength(5);
    });
  });
});
