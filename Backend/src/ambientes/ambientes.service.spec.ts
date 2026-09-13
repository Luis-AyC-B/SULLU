import { Test, TestingModule } from '@nestjs/testing';
import { AmbientesService } from './ambientes.service';

describe('AmbientesService', () => {
  let service: AmbientesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AmbientesService],
    }).compile();

    service = module.get<AmbientesService>(AmbientesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
