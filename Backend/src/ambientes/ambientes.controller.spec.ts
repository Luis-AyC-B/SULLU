import { Test, TestingModule } from '@nestjs/testing';
import { AmbientesController } from './ambientes.controller';
import { AmbientesService } from './ambientes.service';

describe('AmbientesController', () => {
  let controller: AmbientesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AmbientesController],
      providers: [AmbientesService],
    }).compile();

    controller = module.get<AmbientesController>(AmbientesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
