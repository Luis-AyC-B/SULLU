// src/features/registro-ingresos/__tests__/IngresosFiltrosToolbar.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { IngresosFiltrosToolbar } from '../components/IngresosFiltrosToolbar';
import type { ExamenControl, FiltrosIngresos } from '../types/ingresos.types';

describe('HU-17: IngresosFiltrosToolbar (Filtros combinables en cascada)', () => {
  const mockExamenes: ExamenControl[] = [
    {
      id: 1,
      nombre: 'Cálculo II – Examen Final',
      fecha: '2026-09-06',
      facultad: 'Facultad de Ciencias y Tecnología (FCyT)',
      facultadId: 'fcyt',
      carrera: 'Licenciatura en Informática',
      materia: 'Cálculo II',
      materiaId: 'calc-2',
      docente: 'Lic. Ana Rojas',
      docenteId: 'doc-1',
      gestion: 'Gestión 2/2026',
    },
    {
      id: 2,
      nombre: 'Física I – Examen Parcial',
      fecha: '2026-09-07',
      facultad: 'Facultad de Ciencias y Tecnología (FCyT)',
      facultadId: 'fcyt',
      carrera: 'Licenciatura en Informática',
      materia: 'Física I',
      materiaId: 'fis-1',
      docente: 'Lic. Carlos Mendoza',
      docenteId: 'doc-2',
      gestion: 'Gestión 2/2026',
    },
    {
      id: 3,
      nombre: 'Contabilidad I – Primer parcial',
      fecha: '2026-10-15',
      facultad: 'Facultad de Ciencias Económicas (FCE)',
      facultadId: 'fce',
      carrera: 'Administración de Empresas',
      materia: 'Contabilidad I',
      materiaId: 'cont-1',
      docente: 'Lic. Juan Pérez',
      docenteId: 'doc-3',
      gestion: 'Gestión 2/2026',
    },
    {
      id: 4,
      nombre: 'Cálculo II – Primer parcial',
      fecha: '2026-04-10',
      facultad: 'Facultad de Ciencias y Tecnología (FCyT)',
      facultadId: 'fcyt',
      carrera: 'Licenciatura en Informática',
      materia: 'Cálculo II',
      materiaId: 'calc-2',
      docente: 'Lic. Ana Rojas',
      docenteId: 'doc-1',
      gestion: 'Gestión 1/2026',
    },
  ];

  const filtrosIniciales: FiltrosIngresos = {
    facultadId: 'TODAS',
    docenteId: 'TODOS',
    gestion: 'Gestión 2/2026',
    materiaId: 'TODAS',
    examenId: 'TODOS',
  };

  describe('Criterios 1, 2, 3: Visualización de filtros por rol', () => {
    it('Docente visualiza Gestión, Materia y Examen (sin Facultad ni Docente)', () => {
      render(
        <IngresosFiltrosToolbar
          rol="docente"
          examenes={mockExamenes}
          filtros={filtrosIniciales}
          onFiltrosChange={jest.fn()}
        />
      );

      expect(screen.getByText('Gestión')).toBeInTheDocument();
      expect(screen.getByText('Materia')).toBeInTheDocument();
      expect(screen.getByText('Examen')).toBeInTheDocument();
      expect(screen.queryByText('Facultad')).not.toBeInTheDocument();
      expect(screen.queryByText('Docente')).not.toBeInTheDocument();
      expect(screen.getByText('Todas mis materias')).toBeInTheDocument();
    });

    it('Personal de Control visualiza Docente, Gestión, Materia y Examen (sin Facultad)', () => {
      render(
        <IngresosFiltrosToolbar
          rol="control"
          examenes={mockExamenes}
          filtros={filtrosIniciales}
          onFiltrosChange={jest.fn()}
        />
      );

      expect(screen.getByText('Docente')).toBeInTheDocument();
      expect(screen.getByText('Gestión')).toBeInTheDocument();
      expect(screen.getByText('Materia')).toBeInTheDocument();
      expect(screen.getByText('Examen')).toBeInTheDocument();
      expect(screen.queryByText('Facultad')).not.toBeInTheDocument();
      expect(screen.getByText('Todas las materias')).toBeInTheDocument();
    });

    it('Administrador visualiza los 5 filtros: Facultad, Docente, Gestión, Materia y Examen', () => {
      render(
        <IngresosFiltrosToolbar
          rol="admin"
          examenes={mockExamenes}
          filtros={filtrosIniciales}
          onFiltrosChange={jest.fn()}
        />
      );

      expect(screen.getByText('Facultad')).toBeInTheDocument();
      expect(screen.getByText('Docente')).toBeInTheDocument();
      expect(screen.getByText('Gestión')).toBeInTheDocument();
      expect(screen.getByText('Materia')).toBeInTheDocument();
      expect(screen.getByText('Examen')).toBeInTheDocument();
    });
  });

  describe('Criterios 4 y 5: Filtro Gestión', () => {
    it('muestra la gestión vigente seleccionada por defecto ("Gestión 2/2026")', () => {
      render(
        <IngresosFiltrosToolbar
          rol="docente"
          examenes={mockExamenes}
          filtros={filtrosIniciales}
          onFiltrosChange={jest.fn()}
        />
      );

      expect(screen.getByText('Gestión 2/2026')).toBeInTheDocument();
    });
  });
});
