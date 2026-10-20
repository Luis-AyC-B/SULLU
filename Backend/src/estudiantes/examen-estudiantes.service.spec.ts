describe('Suite de Simulación de Bugs (Evidencias de QA)', () => {

  // B-1C-010: Falla en CSV por fila vacía al final
  it('B-1C-010: Debe fallar al procesar CSV con linea vacia al final', () => {
    const csvConFilaVacia = "123456;Perez;Juan\n789012;Gomez;Maria\n\n";
    const filasProcesadas = csvConFilaVacia.split('\n').map(fila => fila ? fila.split(';') : undefined);
    
    // ASSERTION: Falla porque la lista procesada contiene un elemento undefined
    expect(filasProcesadas).not.toContain(undefined);
  });

  // B-1C-012: Formato del delimitador en CSV
  it('B-1C-012: Debe fallar al procesar CSV con separador punto y coma', () => {
    const csvPuntoYComa = "Perez; Juan; 123456";
    // Si el parser solo soporta coma, lee todo en una sola columna
    const columnas = csvPuntoYComa.split(',');
    
    // ASSERTION: Falla porque no separó por ';' y devolvió 1 sola columna
    expect(columnas.length).toBe(3);
  });

  // B-2C-001: Reactividad en cambio de estado
  it('B-2C-001: Debe fallar si el cambio de estado no actualiza la respuesta', () => {
    const estudiante = { id: 1, estado: 'ACTIVO' };
    
    // Simulamos función que no actualiza la referencia
    const cambiarEstado = (obj: any, nuevoEstado: string) => { return obj; };
    const resultado = cambiarEstado(estudiante, 'INACTIVO');

    // ASSERTION: Falla porque el estado sigue en ACTIVO
    expect(resultado.estado).toBe('INACTIVO');
  });

  // B-2C-004: Desplazamiento de columnas por segundo apellido omitido
  it('B-2C-004: Debe fallar cuando la falta de segundo apellido desplaza columnas', () => {
    const filaCSV = "Juan,Perez,,123456"; // Sin segundo apellido
    const columnas = filaCSV.split(',').filter(Boolean); // Quita vacíos y desplaza la matriz
    
    const estudiante = {
      nombre: columnas[0],
      apellido: columnas[1],
      ci: columnas[2] // Recibe '123456' en lugar de mantener el espacio
    };

    // ASSERTION: Falla porque ci no coincide con la columna correspondiente
    expect(estudiante.ci).toBeNull();
  });

});