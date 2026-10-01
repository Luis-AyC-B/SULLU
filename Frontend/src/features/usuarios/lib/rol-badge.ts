/**
 * Asigna un color de badge a partir del NOMBRE del rol (string), sin
 * depender de ningún campo extra en el tipo de datos. El mismo nombre
 * de rol siempre cae en el mismo color, para que se vea consistente
 * en toda la tabla sin tener que guardar nada en la BD.
 */
const PALETTE = [
  "bg-primary/15 text-primary font-medium", // azul marino
  "bg-accent/15 text-accent font-medium", // verde azulado
  "bg-secondary/15 text-secondary font-medium", // naranja
  "bg-destructive/15 text-destructive font-medium", // rojo
];

export function getRolBadgeClasses(nombreRol: string): string {
  let hash = 0;
  for (let i = 0; i < nombreRol.length; i++) {
    hash = (hash * 31 + nombreRol.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}