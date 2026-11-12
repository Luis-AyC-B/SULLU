import { Module, Provider } from '@nestjs/common';
import {
  COMPARADOR_FACIAL_TOKEN,
  ComparadorFacial,
} from './comparador-facial.interface';
import { MemoryComparadorFacial } from './memory-comparador-facial.service';

const comparadorFacialProvider: Provider = {
  provide: COMPARADOR_FACIAL_TOKEN,
  useFactory: (): ComparadorFacial => {
    return new MemoryComparadorFacial();
  },
};

@Module({
  providers: [comparadorFacialProvider],
  exports: [COMPARADOR_FACIAL_TOKEN],
})
export class ComparadorFacialModule {}
