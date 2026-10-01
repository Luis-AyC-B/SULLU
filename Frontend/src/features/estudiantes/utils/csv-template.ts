/**
 * Genera y descarga un archivo CSV de ejemplo listo para que el docente complete los datos.
 */
export function descargarPlantillaCsv(): void {
  const contenido =
    "nombre,apellidos,codigo,ci\r\n" +
    "Juan,Pérez López,202201234,8912345\r\n" +
    "María,González Roca,202105678,";

  const blob = new Blob([contenido], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", "plantilla_estudiantes.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
