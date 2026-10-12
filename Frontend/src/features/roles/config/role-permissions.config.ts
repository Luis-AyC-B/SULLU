// src/features/roles/config/role-permissions.config.ts
import type { ModuloPermisos } from "../types/role.types";

export const modulosPermisos: ModuloPermisos[] = [
  {
    clave: "usuarios",
    label: "USUARIOS",
    permisoVer: { clave: "usuarios.ver", label: "Ver usuarios" },
    acciones: [
      { clave: "usuarios.crear", label: "Crear usuarios" },
      { clave: "usuarios.editar", label: "Editar usuarios" },
      { clave: "usuarios.desactivar", label: "Desactivar usuarios" },
    ],
  },
  {
    clave: "roles",
    label: "ROLES",
    permisoVer: { clave: "roles.ver", label: "Ver roles" },
    acciones: [
      { clave: "roles.crear", label: "Crear roles" },
      { clave: "roles.editar", label: "Editar roles" },
      { clave: "roles.eliminar", label: "Eliminar roles" },
    ],
  },
  {
    clave: "estudiantes",
    label: "ESTUDIANTES",
    permisoVer: { clave: "estudiantes.ver", label: "Ver estudiantes" },
    acciones: [
      { clave: "estudiantes.cargar", label: "Cargar estudiantes" },
      { clave: "estudiantes.habilitar", label: "Habilitar/inhabilitar" },
    ],
  },
  {
    clave: "examenes",
    label: "EXÁMENES",
    permisoVer: { clave: "examenes.ver", label: "Ver exámenes" },
    acciones: [
      { clave: "examenes.crear", label: "Crear exámenes" },
      { clave: "examenes.editar", label: "Editar exámenes" },
      { clave: "examenes.eliminar", label: "Eliminar exámenes" },
    ],
  },
  {
    clave: "ambientes",
    label: "AMBIENTES",
    permisoVer: { clave: "ambientes.ver", label: "Ver ambientes" },
    acciones: [
      { clave: "ambientes.editar", label: "Editar ambiente" },
      { clave: "ambientes.registrar_reserva", label: "Registrar reservas" },
      { clave: "ambientes.cancelar_reserva", label: "Cancelar reservas" },
    ],
  },
  {
    clave: "control_ingreso",
    label: "CONTROL DE INGRESO",
    permisoVer: {
      clave: "control_ingreso.ver_examenes_asignados",
      label: "Ver exámenes asignados",
    },
    acciones: [
      { clave: "control_ingreso.registro_manual", label: "Registrar ingreso manual" },
      { clave: "control_ingreso.escanear_qr", label: "Escanear QR" },
    ],
  },
  {
    clave: "registro_ingresos",
    label: "REGISTRO DE INGRESOS",
    permisoVer: { clave: "registro_ingresos.ver", label: "Ver ingresos" },
    acciones: [],
  },
  {
    clave: "incidencias",
    label: "INCIDENCIAS",
    permisoVer: { clave: "incidencias.ver", label: "Ver incidencias" },
    acciones: [
      { clave: "incidencias.registrar", label: "Registrar incidencias" },
    ],
  },
  {
    clave: "colaboradores",
    label: "COLABORADORES",
    permisoVer: { clave: "colaboradores.ver", label: "Ver nómina" },
    acciones: [
      { clave: "colaboradores.solicitar", label: "Solicitar colaborador" },
      { clave: "colaboradores.asignar_examen", label: "Asignar a examen" },
      { clave: "colaboradores.desasignar_examen", label: "Desasignar de examen" },
      { clave: "colaboradores.dar_de_baja", label: "Dar de baja" },
      { clave: "colaboradores.ver_solicitudes", label: "Ver solicitudes" },
      { clave: "colaboradores.aprobar", label: "Aprobar/rechazar solicitudes" },
    ],
  },
];