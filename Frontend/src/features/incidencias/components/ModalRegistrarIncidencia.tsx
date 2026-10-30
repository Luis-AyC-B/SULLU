import { useEffect, useId, useState } from "react";
import { ArrowLeft, ArrowUpLeft, Search, TriangleAlert, X } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { useEstudiantesExpulsables } from "../hooks/useEstudiantesExpulsables";
import { coincideBusqueda } from "../lib/filtrarIncidencias";
import {
  OPCIONES_MOTIVO_EXPULSION,
  formularioExpulsionSchema,
  type EstudianteExpulsable,
  type MotivoExpulsion,
  type ValoresFormularioExpulsion,
} from "../types/incidencias.types";

interface ModalRegistrarIncidenciaProps {
  abierto: boolean;
  onAbiertoChange: (abierto: boolean) => void;
  examenId: string;
  examenNombre: string;
  // Se llama con los datos ya validados; el padre abre la confirmación encima.
  onContinuar: (valores: ValoresFormularioExpulsion) => void;
}

type Campo = "estudiante" | "motivo" | "detalle";
type Errores = Partial<Record<Campo, string>>;

export function ModalRegistrarIncidencia({
  abierto,
  onAbiertoChange,
  examenId,
  examenNombre,
  onContinuar,
}: ModalRegistrarIncidenciaProps) {
  const idBase = useId();
  const idEstudiante = `${idBase}-estudiante`;
  const idLista = `${idBase}-lista`;
  const idMotivo = `${idBase}-motivo`;
  const idDetalle = `${idBase}-detalle`;

  const [busqueda, setBusqueda] = useState("");
  const [estudiante, setEstudiante] = useState<EstudianteExpulsable | null>(
    null,
  );
  const [listaAbierta, setListaAbierta] = useState(false);
  const [indiceActivo, setIndiceActivo] = useState(0);
  const [motivo, setMotivo] = useState<MotivoExpulsion | "">("");
  const [detalle, setDetalle] = useState("");
  const [errores, setErrores] = useState<Errores>({});

  // Búsqueda en el servidor (solo estudiantes que ingresaron y no están expulsados).
  const hayConsulta = busqueda.trim() !== "";
  const { resultados: resultadosServidor, cargando } =
    useEstudiantesExpulsables(
      examenId,
      busqueda,
      abierto && estudiante === null && hayConsulta,
    );
  // Solo coincidencias con lo escrito; sin texto no se muestra nada.
  const resultados = hayConsulta
    ? resultadosServidor.filter((e) =>
        coincideBusqueda(e.nombre, e.codigoSis, busqueda),
      )
    : [];

  // Al cerrar el modal se limpia todo; mientras la confirmación está encima
  // el modal sigue abierto y conserva los datos.
  useEffect(() => {
    if (abierto) return;
    setBusqueda("");
    setEstudiante(null);
    setListaAbierta(false);
    setIndiceActivo(0);
    setMotivo("");
    setDetalle("");
    setErrores({});
  }, [abierto]);

  function limpiarError(campo: Campo) {
    setErrores((previos) => ({ ...previos, [campo]: undefined }));
  }

  function seleccionar(elegido: EstudianteExpulsable) {
    setEstudiante(elegido);
    setBusqueda("");
    setListaAbierta(false);
    limpiarError("estudiante");
  }

  function alTeclear(evento: React.KeyboardEvent<HTMLInputElement>) {
    if (!listaAbierta) {
      if (evento.key === "ArrowDown") setListaAbierta(true);
      return;
    }
    if (evento.key === "ArrowDown") {
      evento.preventDefault();
      setIndiceActivo((i) => Math.min(i + 1, resultados.length - 1));
    } else if (evento.key === "ArrowUp") {
      evento.preventDefault();
      setIndiceActivo((i) => Math.max(i - 1, 0));
    } else if (evento.key === "Enter") {
      evento.preventDefault();
      const elegido = resultados[indiceActivo];
      if (elegido) seleccionar(elegido);
    }
  }

  function continuar(evento: React.FormEvent) {
    evento.preventDefault();
    const resultado = formularioExpulsionSchema.safeParse({
      estudiante: estudiante ?? undefined,
      motivo: motivo || undefined,
      detalle,
    });
    if (!resultado.success) {
      const nuevos: Errores = {};
      for (const problema of resultado.error.issues) {
        const campo = problema.path[0];
        if (
          (campo === "estudiante" || campo === "motivo" || campo === "detalle") &&
          !nuevos[campo]
        ) {
          nuevos[campo] = problema.message;
        }
      }
      setErrores(nuevos);
      return;
    }
    setErrores({});
    onContinuar(resultado.data);
  }

  return (
    <Dialog open={abierto} onOpenChange={onAbiertoChange}>
      <DialogContent
        showCloseButton={false}
        className="flex flex-col gap-0 overflow-y-auto max-md:left-0 max-md:top-0 max-md:h-dvh max-md:max-w-none max-md:translate-x-0 max-md:translate-y-0 max-md:rounded-none md:max-h-[90dvh] md:max-w-xl">
        <Button
          type="button"
          variant="ghost"
          className="-ml-3 mb-2 self-start text-primary md:hidden"
          onClick={() => onAbiertoChange(false)}
        >
          <ArrowLeft aria-hidden className="h-4 w-4" />
          Incidencias
        </Button>

        <DialogHeader className="mb-6 text-left">
          <DialogTitle className="text-3xl font-bold text-primary">
            Registrar incidencia
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {examenNombre}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={continuar} noValidate className="flex flex-col gap-5">
          {/* Estudiante */}
          <div>
            <Label htmlFor={idEstudiante}>Estudiante</Label>

            {estudiante ? (
              <div className="mt-2 rounded-xl border border-border bg-card p-2">
                <div className="flex items-center justify-between gap-3 rounded-lg bg-muted px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{estudiante.nombre}</p>
                    <p className="text-sm text-muted-foreground tabular-nums">
                      Código SIS: {estudiante.codigoSis}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Quitar estudiante seleccionado"
                    onClick={() => setEstudiante(null)}
                  >
                    <X aria-hidden className="h-4 w-4 text-primary" />
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="relative mt-2">
                  <Input
                    id={idEstudiante}
                    role="combobox"
                    aria-expanded={listaAbierta}
                    aria-controls={idLista}
                    aria-autocomplete="list"
                    aria-invalid={Boolean(errores.estudiante)}
                    autoComplete="off"
                    placeholder="Buscar por nombre o código SIS"
                    value={busqueda}
                    onChange={(e) => {
                      setBusqueda(e.target.value);
                      setIndiceActivo(0);
                      setListaAbierta(true);
                    }}
                    onFocus={() => setListaAbierta(true)}
                    onBlur={() => setListaAbierta(false)}
                    onKeyDown={alTeclear}
                    className="h-11 bg-card pr-10"
                  />
                  <Search
                    aria-hidden
                    className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  />
                </div>

                {listaAbierta && hayConsulta && (
                  <ul
                    id={idLista}
                    role="listbox"
                    aria-label="Estudiantes que pueden ser expulsados"
                    className="mt-1 max-h-56 overflow-y-auto rounded-xl border border-border bg-card"
                  >
                    {resultados.length === 0 ? (
                      <li className="px-4 py-3 text-sm text-muted-foreground">
                        {cargando
                          ? "Buscando..."
                          : "No se encontraron estudiantes."}
                      </li>
                    ) : (
                      resultados.map((e, indice) => (
                        <li
                          key={e.codigoSis}
                          role="option"
                          aria-selected={indice === indiceActivo}
                          // mouseDown evita que el input pierda el foco antes del click
                          onMouseDown={(ev) => ev.preventDefault()}
                          onClick={() => seleccionar(e)}
                          className={`flex cursor-pointer items-center justify-between gap-3 border-b border-border px-4 py-3 last:border-b-0 ${
                            indice === indiceActivo ? "bg-muted" : ""
                          }`}
                        >
                          <div className="min-w-0">
                            <p className="truncate font-semibold">{e.nombre}</p>
                            <p className="text-sm text-muted-foreground tabular-nums">
                              SIS: {e.codigoSis}
                            </p>
                          </div>
                          <ArrowUpLeft
                            aria-hidden
                            className="h-4 w-4 shrink-0 text-primary"
                          />
                        </li>
                      ))
                    )}
                  </ul>
                )}
              </>
            )}

            <p className="mt-2 text-sm text-muted-foreground">
              Solo aparecen estudiantes que ya ingresaron al examen y no están
              expulsados.
            </p>
            {errores.estudiante && (
              <p role="alert" className="mt-1.5 text-sm text-destructive">
                {errores.estudiante}
              </p>
            )}
          </div>

          {/* Motivo */}
          <div>
            <Label htmlFor={idMotivo}>Motivo</Label>
            <Select
              value={motivo}
              onValueChange={(valor) => {
                setMotivo(valor as MotivoExpulsion);
                limpiarError("motivo");
              }}
            >
              <SelectTrigger
                id={idMotivo}
                aria-invalid={Boolean(errores.motivo)}
                className="mt-2 w-full bg-card data-[size=default]:h-11"
              >
                <SelectValue placeholder="Seleccionar motivo" />
              </SelectTrigger>
              <SelectContent>
                {OPCIONES_MOTIVO_EXPULSION.map((opcion) => (
                  <SelectItem key={opcion.valor} value={opcion.valor}>
                    {opcion.etiqueta}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errores.motivo && (
              <p role="alert" className="mt-1.5 text-sm text-destructive">
                {errores.motivo}
              </p>
            )}
          </div>

          {/* Detalle */}
          <div>
            <Label htmlFor={idDetalle}>Detalle · Obligatorio</Label>
            <textarea
              id={idDetalle}
              rows={4}
              aria-invalid={Boolean(errores.detalle)}
              placeholder="Describe lo ocurrido y el motivo de la expulsión"
              value={detalle}
              onChange={(e) => {
                setDetalle(e.target.value);
                limpiarError("detalle");
              }}
              className="mt-2 flex min-h-28 w-full rounded-lg border border-input bg-card px-3 py-2 text-body placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-[invalid=true]:border-destructive"
            />
            {errores.detalle && (
              <p role="alert" className="mt-1.5 text-sm text-destructive">
                {errores.detalle}
              </p>
            )}
          </div>

          {/* Advertencia */}
          <div className="flex items-start gap-3 rounded-lg border border-secondary bg-secondary/10 px-4 py-3 text-sm">
            <TriangleAlert
              aria-hidden
              className="mt-0.5 h-4 w-4 shrink-0 text-secondary"
            />
            <p>
              Esta acción queda registrada y el estudiante no podrá reingresar
              al examen.
            </p>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:justify-end">
            <Button
              type="button"
              variant="outline"
              className="h-11 border-primary bg-card px-6 text-primary hover:bg-muted"
              onClick={() => onAbiertoChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" className="h-11 px-6">
              Confirmar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}