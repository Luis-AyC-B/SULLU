"use client";

import { useMemo, useState } from "react";
import { Calendar as CalendarIcon, ChevronDown, ChevronUp } from "lucide-react";

interface FechaSelectorProps {
  fechaSeleccionada: string;
  onSelectFecha: (fecha: string) => void;
}

export function FechaSelector({
  fechaSeleccionada,
  onSelectFecha,
}: FechaSelectorProps) {
  const [isOpen, setIsOpen] = useState(true);

  // Calcular fechas base (Hoy y Dentro de 1 mes)
  const { hoy, dentroDeUnMes, formatoTexto } = useMemo(() => {
    // Si la fechaSeleccionada es válida, parsear año/mes/día sin desfase de zona horaria
    const [y, m, d] = fechaSeleccionada.split("-").map(Number);
    const dateSel = new Date(y, (m || 1) - 1, d || 1);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const maxDate = new Date(today);
    maxDate.setDate(today.getDate() + 30);

    const meses = [
      "enero", "febrero", "marzo", "abril", "mayo", "junio",
      "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
    ];

    const texto = `${dateSel.getDate()} de ${meses[dateSel.getMonth()]} de ${dateSel.getFullYear()}`;

    return {
      hoy: today,
      dentroDeUnMes: maxDate,
      formatoTexto: texto,
    };
  }, [fechaSeleccionada]);

  // Generar datos para los 2 meses visibles (mes actual y mes siguiente)
  const mesesVisibles = useMemo(() => {
    const today = new Date();
    const mes1Year = today.getFullYear();
    const mes1Index = today.getMonth();

    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const mes2Year = nextMonth.getFullYear();
    const mes2Index = nextMonth.getMonth();

    const nombresMeses = [
      "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
      "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];

    const generarDiasMes = (year: number, monthIndex: number) => {
      const diasEnMes = new Date(year, monthIndex + 1, 0).getDate();
      // Día de la semana del primer día (0=Dom, 1=Lun, ..., 6=Sab). Ajustar a Lun=0, Dom=6
      const primerDiaSemana = (new Date(year, monthIndex, 1).getDay() + 6) % 7;

      const dias = [];
      // Espacios vacíos antes del día 1
      for (let i = 0; i < primerDiaSemana; i++) {
        dias.push({ empty: true, dia: 0, dateStr: "", habilitado: false, seleccionado: false });
      }

      for (let d = 1; d <= diasEnMes; d++) {
        const dateObj = new Date(year, monthIndex, d);
        dateObj.setHours(0, 0, 0, 0);

        const yStr = String(year);
        const mStr = String(monthIndex + 1).padStart(2, "0");
        const dStr = String(d).padStart(2, "0");
        const dateStr = `${yStr}-${mStr}-${dStr}`;

        // Regla de negocio: Solo entre hoy y 30 días adelante (1 mes)
        const habilitado = dateObj >= hoy && dateObj <= dentroDeUnMes;
        const seleccionado = dateStr === fechaSeleccionada;

        dias.push({
          empty: false,
          dia: d,
          dateStr,
          habilitado,
          seleccionado,
        });
      }

      return dias;
    };

    return [
      {
        titulo: `${nombresMeses[mes1Index]} ${mes1Year}`,
        dias: generarDiasMes(mes1Year, mes1Index),
      },
      {
        titulo: `${nombresMeses[mes2Index]} ${mes2Year}`,
        dias: generarDiasMes(mes2Year, mes2Index),
      },
    ];
  }, [fechaSeleccionada, hoy, dentroDeUnMes]);

  const textoRango = useMemo(() => {
    const mesesCortos = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
    const inicio = `${hoy.getDate()} ${mesesCortos[hoy.getMonth()]}`;
    const fin = `${dentroDeUnMes.getDate()} ${mesesCortos[dentroDeUnMes.getMonth()]} ${dentroDeUnMes.getFullYear()}`;
    return `Intervalo permitido: ${inicio} – ${fin}, inclusive`;
  }, [hoy, dentroDeUnMes]);

  return (
    <div className="space-y-3">
      <label className="text-xs font-semibold text-foreground/80 uppercase tracking-wider block">
        Fecha de consulta
      </label>

      {/* Input desplegable idéntico al mockup */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-card border border-border/80 rounded-xl text-sm font-medium text-foreground hover:border-primary/50 transition-all shadow-xs"
      >
        <div className="flex items-center gap-2.5">
          <CalendarIcon className="w-4 h-4 text-primary" />
          <span>{formatoTexto}</span>
        </div>
        {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      <p className="text-xs text-muted-foreground">
        Solo puedes ver horarios dentro del próximo mes.
      </p>

      {/* Vista visual de 2 meses del mockup */}
      {isOpen && (
        <div className="border border-border/70 rounded-2xl p-4 bg-card shadow-xs animate-in fade-in duration-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {mesesVisibles.map((mes, idx) => (
              <div key={idx} className="space-y-3">
                <h4 className="text-sm font-bold text-foreground text-center">
                  {mes.titulo}
                </h4>

                {/* Días de la semana L M M J V S D */}
                <div className="grid grid-cols-7 text-center text-xs font-medium text-muted-foreground mb-1">
                  <span>L</span>
                  <span>M</span>
                  <span>M</span>
                  <span>J</span>
                  <span>V</span>
                  <span>S</span>
                  <span>D</span>
                </div>

                {/* Cuadrícula de días */}
                <div className="grid grid-cols-7 gap-1 text-center text-xs">
                  {mes.dias.map((d, dIdx) => {
                    if (d.empty) {
                      return <div key={dIdx} className="h-7 w-7" />;
                    }

                    if (d.seleccionado) {
                      return (
                        <button
                          key={dIdx}
                          type="button"
                          className="h-7 w-7 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center mx-auto shadow-xs cursor-pointer"
                        >
                          {d.dia}
                        </button>
                      );
                    }

                    if (!d.habilitado) {
                      return (
                        <div
                          key={dIdx}
                          className="h-7 w-7 rounded-md bg-muted/40 text-muted-foreground/40 flex items-center justify-center mx-auto cursor-not-allowed select-none"
                        >
                          {d.dia}
                        </div>
                      );
                    }

                    return (
                      <button
                        key={dIdx}
                        type="button"
                        onClick={() => onSelectFecha(d.dateStr)}
                        className="h-7 w-7 rounded-md text-foreground hover:bg-muted font-medium flex items-center justify-center mx-auto transition-colors cursor-pointer"
                      >
                        {d.dia}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t border-border/60 text-center">
            <p className="text-[11px] text-muted-foreground font-medium">
              {textoRango}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
