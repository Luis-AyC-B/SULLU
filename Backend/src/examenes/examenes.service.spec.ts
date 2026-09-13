import { Test, TestingModule } from '@nestjs/testing';
import { ExamenesService } from './examenes.service';

describe('ExamenesService', () => {
  let service: ExamenesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ExamenesService],
    }).compile();

    service = module.get<ExamenesService>(ExamenesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
