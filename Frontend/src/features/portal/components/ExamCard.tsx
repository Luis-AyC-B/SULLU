import type { ExamenEstudiante } from '../types/student-exam.types';

function formatFecha(iso: string) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export function ExamCard({ examen }: { examen: ExamenEstudiante }) {
  const habilitado = examen.estado === 'Habilitado';

  return (
    <article className="flex flex-col rounded-xl border border-border bg-card p-5 text-card-foreground">
      <p className="text-sm text-muted-foreground">{examen.carrera}</p>
      <h2 className="mt-1 text-base font-semibold text-foreground">{examen.nombre}</h2>

      <dl className="mt-6 grid flex-1 grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)] gap-x-4 text-sm">
        <div>
          <dt className="text-muted-foreground">Ambiente</dt>
          <dd className="mt-1 text-foreground">
            {examen.ambiente} ({examen.facultad})
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Fecha</dt>
          <dd className="mt-1 text-foreground">{formatFecha(examen.fecha)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Hora</dt>
          <dd className="mt-1 text-foreground">
            {examen.horaInicio} – {examen.horaFin}
          </dd>
        </div>
      </dl>

      <p
        className={`mt-5 border-t border-border pt-4 text-sm font-medium ${
          habilitado ? 'text-success' : 'text-destructive'
        }`}
      >
        {examen.estado}
      </p>
    </article>
  );
}