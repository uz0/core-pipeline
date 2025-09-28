import { LoggerService } from './logger.service';

describe('LoggerService', () => {
  let service: LoggerService;

  beforeEach(() => {
    service = new LoggerService();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should have log method', () => {
    expect(service.log).toBeDefined();
  });

  it('should have error method', () => {
    expect(service.error).toBeDefined();
  });

  it('should have warn method', () => {
    expect(service.warn).toBeDefined();
  });

  it('should have debug method', () => {
    expect(service.debug).toBeDefined();
  });
});