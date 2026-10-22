'use client';

import { useEffect, useState } from 'react';
import { Settings, Check } from 'lucide-react';
import {
  type EscenarioMock,
  getEscenarioMock,
  setEscenarioMock,
  suscribirEscenarioMock,
} from '../api/mock-exam-qr.service';

interface MockScenarioSelectorProps {
  onScenarioChange?: () => void;
}

const OPCIONES_ESCENARIOS: { valor: EscenarioMock; label: string }[] = [
  { valor: 'TODOS_LOS_ESTADOS', label: '1. Todos los estados a la vez' },
  { valor: 'LISTA_VACIA', label: '2. Lista de exámenes vacía' },
  { valor: 'ERROR_RED', label: '3. Error de red (Reintentar)' },
  { valor: 'VERIFICACION_EXITOSA', label: '4. Verificación exitosa' },
  { valor: 'VERIFICACION_FALLIDA_1', label: '5. Verificación fallida (Intento 1)' },
  { valor: 'VERIFICACION_FALLIDA_2', label: '6. Verificación fallida (Intento 2)' },
  { valor: 'INTENTOS_AGOTADOS', label: '7. Intentos agotados (3 de 3)' },
  { valor: 'SIN_ROSTRO', label: '8. Foto sin rostro detectado' },
  { valor: 'VERIFICACION_FOTO_DESACTIVADA', label: '9. Verificación foto desactivada' },
  { valor: 'QR_VENCE_EN_VIVO', label: '10. QR que vence en vivo (8 seg)' },
];

export function MockScenarioSelector({ onScenarioChange }: MockScenarioSelectorProps) {
  const isMockEnabled =
    process.env.NEXT_PUBLIC_USE_MOCKS === 'true' &&
    process.env.NODE_ENV !== 'production';

  const [escenario, setEscenario] = useState<EscenarioMock>('TODOS_LOS_ESTADOS');
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    if (!isMockEnabled) return;
    setEscenario(getEscenarioMock());
    return suscribirEscenarioMock((nuevo) => setEscenario(nuevo));
  }, [isMockEnabled]);

  if (!isMockEnabled) {
    return null;
  }

  const handleSeleccionar = (valor: EscenarioMock) => {
    setEscenarioMock(valor);
    setAbierto(false);
    onScenarioChange?.();
  };

  return (
    <aside
      aria-label="Selector de Escenarios de Prueba"
      className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2"
    >
      {abierto && (
        <div className="w-80 rounded-xl border border-border bg-card p-3 shadow-xl backdrop-blur-md">
          <div className="mb-2 flex items-center justify-between border-b border-border pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              Modo Mock: Escenarios
            </span>
            <button
              type="button"
              onClick={() => setAbierto(false)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Cerrar
            </button>
          </div>

          <div className="flex flex-col gap-1 max-h-72 overflow-y-auto">
            {OPCIONES_ESCENARIOS.map((opcion) => {
              const seleccionado = escenario === opcion.valor;
              return (
                <button
                  key={opcion.valor}
                  type="button"
                  onClick={() => handleSeleccionar(opcion.valor)}
                  className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors ${
                    seleccionado
                      ? 'bg-primary text-primary-foreground font-semibold'
                      : 'hover:bg-muted text-foreground'
                  }`}
                >
                  <span className="truncate">{opcion.label}</span>
                  {seleccionado && <Check className="h-3.5 w-3.5 shrink-0 ml-1" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setAbierto(!abierto)}
        className="flex items-center gap-2 rounded-full border border-primary/30 bg-primary px-3 py-2 text-xs font-medium text-primary-foreground shadow-lg hover:bg-primary/90 transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        title="Configurar escenario del modo mock"
      >
        <Settings className="h-3.5 w-3.5 animate-spin-slow" />
        <span>Escenario: {escenario}</span>
      </button>
    </aside>
  );
}

