import { Module, Provider } from '@nestjs/common';
import {
  COMPARADOR_FACIAL_TOKEN,
  ComparadorFacial,
} from './comparador-facial.interface';
import { StubComparadorFacial } from './stub-comparador-facial.service';
import { LocalComparadorFacial } from './local-comparador-facial.service';

const comparadorFacialProvider: Provider = {
  provide: COMPARADOR_FACIAL_TOKEN,
  useFactory: (): ComparadorFacial => {
    const modo = (process.env.COMPARADOR_FACIAL || 'local').trim().toLowerCase();
    if (modo === 'stub') {
      return new StubComparadorFacial();
    }
    return new LocalComparadorFacial();
  },
};

@Module({
  providers: [StubComparadorFacial, LocalComparadorFacial, comparadorFacialProvider],
  exports: [COMPARADOR_FACIAL_TOKEN, StubComparadorFacial, LocalComparadorFacial],
})
export class ComparadorFacialModule {}
