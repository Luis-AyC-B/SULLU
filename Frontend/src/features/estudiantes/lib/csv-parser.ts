import { EstudianteExamen, FilaRechazada, ResultadoCargaEstudiantes } from "../types/estudiante.types";
export interface ParseCsvResult {
    validos: EstudianteExamen[];
    resultado: ResultadoCargaEstudiantes;
}
/**
 * Parsea un archivo de texto en formato CSV respetando comas y punto y coma.
 */
export async function parseEstudiantesCsv(
    file: File,
    existingCodes: Set<string> = new Set()
): Promise<ParseCsvResult> {
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith(".csv")) {
        throw new Error("Formato de archivo no soportado. Debe ser un archivo .csv");
    }
    const text = await file.text();
    const rawLines = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0);
    if (rawLines.length === 0) {
        throw new Error("El archivo no contiene datos para procesar");
    }
    // Detectar delimitador (coma o punto y coma)
    const firstLine = rawLines[0];
    const delimiter = firstLine.includes(";") ? ";" : ",";
    const splitRow = (line: string): string[] => {
        // Manejo básico de comillas
        const result: string[] = [];
        let current = "";
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === delimiter && !inQuotes) {
                result.push(current.trim());
                current = "";
            } else {
                current += char;
            }
        }
        result.push(current.trim());
        return result;
    };
    const headers = splitRow(rawLines[0]).map((h) =>
        h.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    );
    let nombreIdx = headers.findIndex((h) => h.includes("nombre"));
    let apellidoIdx = headers.findIndex((h) => h.includes("apellido"));
    let codIdx = headers.findIndex(
        (h) => h.includes("cod") || h.includes("sis") || h.includes("codigo")
    );
    let ciIdx = headers.findIndex((h) => h.includes("ci") || h.includes("cedula"));
    let dataStartIndex = 1;
    // Si la primera fila no tiene encabezados reconocibles, asumir columnas posicionales
    if (nombreIdx === -1 && codIdx === -1) {
        // Asumir formato: nombre, apellido, codsis, [ci]
        nombreIdx = 0;
        apellidoIdx = 1;
        codIdx = 2;
        ciIdx = 3;
        dataStartIndex = 0;
    } else {
        // Si faltan apellidos pero hay 'nombre', intentar fallback
        if (apellidoIdx === -1 && headers.length >= 3) {
            apellidoIdx = 1;
        }
        if (codIdx === -1 && headers.length >= 3) {
            codIdx = 2;
        }
    }
    const validos: EstudianteExamen[] = [];
    const filasRechazadas: FilaRechazada[] = [];
    const seenCodesInFile = new Set<string>();
    const dataLines = rawLines.slice(dataStartIndex);
    if (dataLines.length === 0) {
        throw new Error("El archivo no contiene datos para procesar");
    }
    let fileRowNumber = dataStartIndex + 1;
    for (const line of dataLines) {
        const cols = splitRow(line);
        const nombre = cols[nombreIdx]?.replace(/^"|"$/g, "").trim() || "";
        const apellido = cols[apellidoIdx]?.replace(/^"|"$/g, "").trim() || "";
        const cod_sis = cols[codIdx]?.replace(/^"|"$/g, "").trim() || "";
        const ci = ciIdx !== -1 && cols[ciIdx] ? cols[ciIdx].replace(/^"|"$/g, "").trim() : "";
        // Validación de campos obligatorios
        const faltantes: string[] = [];
        if (!nombre) faltantes.push("nombre");
        if (!apellido) faltantes.push("apellidos");
        if (!cod_sis) faltantes.push("código de estudiante");
        if (faltantes.length > 0) {
            filasRechazadas.push({
                fila: fileRowNumber,
                cod_sis: cod_sis || undefined,
                nombre: nombre || undefined,
                motivo: `Falta campo obligatorio: ${faltantes.join(", ")}`,
            });
            fileRowNumber++;
            continue;
        }
        // Validación de duplicados dentro del archivo
        if (seenCodesInFile.has(cod_sis)) {
            filasRechazadas.push({
                fila: fileRowNumber,
                cod_sis,
                nombre: `${nombre} ${apellido}`,
                motivo: "Código duplicado en el archivo",
            });
            fileRowNumber++;
            continue;
        }
        seenCodesInFile.add(cod_sis);
        // Si ya existe en la lista previa del examen, no se duplica
        if (existingCodes.has(cod_sis)) {
            filasRechazadas.push({
                fila: fileRowNumber,
                cod_sis,
                nombre: `${nombre} ${apellido}`,
                motivo: "Estudiante ya vinculado a este examen",
            });
            fileRowNumber++;
            continue;
        }

        validos.push({
            estudiante_id: Math.floor(Math.random() * 100000) + 10,
            cod_sis,
            nombre,
            apellido,
            ci: ci || null,
            estado_habilitado: true,
            motivo_inhabilitacion: null,
        });
        fileRowNumber++;
    }
    if (validos.length === 0 && filasRechazadas.length === 0) {
        throw new Error("El archivo no contiene datos para procesar");
    }
    return {
        validos,
        resultado: {
            totalLeidos: dataLines.length,
            insertadosOReutilizados: validos.length,
            rechazados: filasRechazadas.length,
            filasRechazadas,
        },
    };
}

