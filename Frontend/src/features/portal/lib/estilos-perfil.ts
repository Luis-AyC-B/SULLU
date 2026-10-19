/**
 * Clases de botones del perfil, iguales a los de confirmación:
 * primario relleno en azul y secundario con borde azul. La altura se define donde se usan.
 */
export const BTN_PRIMARIO =
  'gap-2 rounded-lg bg-primary px-5 font-semibold text-primary-foreground shadow-sm hover:bg-primary/90';

export const BTN_SECUNDARIO =
  'gap-2 rounded-lg border border-primary bg-white px-5 font-semibold text-primary shadow-none hover:bg-primary/5 hover:text-primary';

export const BTN_PELIGRO =
  'gap-2 rounded-lg px-4 font-medium text-destructive hover:bg-destructive/10 hover:text-destructive';

/** Aviso de error con fondo suave, usado en vez de texto rojo suelto. */
export const AVISO_ERROR =
  'flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive';