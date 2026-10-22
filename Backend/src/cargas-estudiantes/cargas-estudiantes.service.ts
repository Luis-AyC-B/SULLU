import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import {
  FilaEstudianteCsv,
  FilaRechazada,
  FilaAviso,
} from './cargas-estudiantes.parser';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

export interface FilaResultadoDetalle {
  fila?: number;
  cod_sis: string;
  nombre: string;
  apellido: string;
  ci: string | null;
  correo: string;
  estado: 'CREADO' | 'OMITIDO' | 'ERROR';
  motivo?: string;
  ciPendiente?: boolean;
}

export interface InfoEstudianteProcesado {
  estudianteId: number;
  estado_habilitado: boolean;
  ya_vinculado: boolean;
}

export interface ResultadoProcesamientoEstudiantes {
  resumen: {
    total_filas: number;
    procesadas: number;
    rechazadas: number;
    creados: number;
    omitidos: number;
    con_error: number;
    cuentas_creadas: number;
    estudiantes_creados: number;
    estudiantes_reutilizados: number;
    vinculados_nuevos: number;
    ya_vinculados: number;
    pendientes_ci: number;
  };
  rechazados: FilaRechazada[];
  avisos: FilaAviso[];
  detalleFilas: FilaResultadoDetalle[];
  resultadosPorSis: Map<string, InfoEstudianteProcesado>;
}

@Injectable()
export class CargasEstudiantesService {
  private readonly logger = new Logger(CargasEstudiantesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  async procesarEstudiantesParaExamen(
    examenId: number,
    filasValidas: FilaEstudianteCsv[],
    totalFilas: number,
    rechazadosIniciales: FilaRechazada[] = [],
    avisosIniciales: FilaAviso[] = [],
  ): Promise<ResultadoProcesamientoEstudiantes> {
    const rechazados: FilaRechazada[] = [...rechazadosIniciales];
    const avisos: FilaAviso[] = [...avisosIniciales];
    const detalleFilas: FilaResultadoDetalle[] = [];
    const resultadosPorSis = new Map<string, InfoEstudianteProcesado>();

    for (const r of rechazadosIniciales) {
      detalleFilas.push({
        fila: r.fila,
        cod_sis: r.cod_sis || '—',
        nombre: '—',
        apellido: '—',
        ci: null,
        correo: '—',
        estado: 'ERROR',
        motivo: r.motivo,
      });
    }

    if (filasValidas.length === 0) {
      return {
        resumen: {
          total_filas: totalFilas,
          procesadas: 0,
          rechazadas: rechazados.length,
          creados: 0,
          omitidos: 0,
          con_error: rechazados.length,
          cuentas_creadas: 0,
          estudiantes_creados: 0,
          estudiantes_reutilizados: 0,
          vinculados_nuevos: 0,
          ya_vinculados: 0,
          pendientes_ci: 0,
        },
        rechazados,
        avisos,
        detalleFilas,
        resultadosPorSis,
      };
    }

    // 1. Rol Estudiante garantizado
    const rolEstudiante = await this.prisma.rol.upsert({
      where: { nombre: 'Estudiante' },
      update: {},
      create: {
        nombre: 'Estudiante',
        descripcion: 'Estudiante con acceso al portal de exámenes',
        esPlantilla: true,
      },
    });

    let creados = 0;
    let omitidos = 0;
    let con_error = rechazados.length;
    let cuentas_creadas = 0;
    let estudiantes_reutilizados = 0;
    let vinculados_nuevos = 0;
    let ya_vinculados = 0;
    let pendientes_ci = 0;

    for (const fila of filasValidas) {
      const codSisLimpio = fila.cod_sis.trim();
      const correoInstitucional =
        fila.correo || `${codSisLimpio.toLowerCase()}@est.umss.edu.bo`;
      const ciLimpio = fila.ci ? fila.ci.trim() : null;
      const ciPendiente = !ciLimpio;

      if (ciPendiente) {
        pendientes_ci++;
      }

      try {
        await this.prisma.$transaction(async (tx) => {
          // 1. Buscar estudiante por cod_sis
          let estudiante = await tx.estudiante.findUnique({
            where: { cod_sis: codSisLimpio },
            include: { usuario: true },
          });

          let fueCreadoEstudiante = false;
          let fueCreadoUsuario = false;

          if (!estudiante) {
            // Generar contraseña: CI o temporal aleatoria
            const passwordPlana = ciLimpio
              ? ciLimpio
              : crypto.randomBytes(6).toString('hex');
            const passwordHash = await bcrypt.hash(passwordPlana, 10);

            // Buscar si ya existe Usuario con ese correo
            let usuario = await tx.usuario.findFirst({
              where: {
                correo: { equals: correoInstitucional, mode: 'insensitive' },
              },
            });

            if (!usuario) {
              usuario = await tx.usuario.create({
                data: {
                  nombre: fila.nombre,
                  apellido: fila.apellido,
                  correo: correoInstitucional,
                  password: passwordHash,
                  debeConfigurarPerfil: true,
                  debeCambiarPassword: true,
                  roles: {
                    create: [{ rolId: rolEstudiante.id }],
                  },
                },
              });
              fueCreadoUsuario = true;
            }

            estudiante = await tx.estudiante.create({
              data: {
                cod_sis: codSisLimpio,
                nombre: fila.nombre,
                apellido: fila.apellido,
                ci: ciLimpio,
                usuarioId: usuario.id,
                perfilCompleto: false,
                qrVersion: 1,
              },
              include: { usuario: true },
            });

            fueCreadoEstudiante = true;
          } else {
            // Estudiante ya existía: verificar si le falta usuario
            if (!estudiante.usuarioId) {
              const passwordPlana =
                ciLimpio ||
                estudiante.ci ||
                crypto.randomBytes(6).toString('hex');
              const passwordHash = await bcrypt.hash(passwordPlana, 10);

              let usuario = await tx.usuario.findFirst({
                where: {
                  correo: { equals: correoInstitucional, mode: 'insensitive' },
                },
              });

              if (!usuario) {
                usuario = await tx.usuario.create({
                  data: {
                    nombre: estudiante.nombre,
                    apellido: estudiante.apellido,
                    correo: correoInstitucional,
                    password: passwordHash,
                    debeConfigurarPerfil: true,
                    debeCambiarPassword: true,
                    roles: {
                      create: [{ rolId: rolEstudiante.id }],
                    },
                  },
                });
                fueCreadoUsuario = true;
              }

              estudiante = await tx.estudiante.update({
                where: { id: estudiante.id },
                data: { usuarioId: usuario.id },
                include: { usuario: true },
              });
            }

            // Actualizar CI si antes no lo tenía y ahora viene en el CSV
            if (!estudiante.ci && ciLimpio) {
              estudiante = await tx.estudiante.update({
                where: { id: estudiante.id },
                data: { ci: ciLimpio },
                include: { usuario: true },
              });
            }
          }

          // 2. Vincular con examen (idempotente)
          let vinculo = await tx.examen_Estudiante.findUnique({
            where: {
              estudianteId_examenId: {
                estudianteId: estudiante.id,
                examenId,
              },
            },
          });

          let yaEstabaVinculado = false;
          if (vinculo) {
            yaEstabaVinculado = true;
            ya_vinculados++;
          } else {
            vinculo = await tx.examen_Estudiante.create({
              data: {
                estudianteId: estudiante.id,
                examenId,
                estado_habilitado: true,
              },
            });
            vinculados_nuevos++;
          }

          resultadosPorSis.set(codSisLimpio, {
            estudianteId: estudiante.id,
            estado_habilitado: vinculo.estado_habilitado,
            ya_vinculado: yaEstabaVinculado,
          });

          if (fueCreadoEstudiante || fueCreadoUsuario) {
            creados++;
            if (fueCreadoUsuario) cuentas_creadas++;
            detalleFilas.push({
              fila: fila.fila,
              cod_sis: codSisLimpio,
              nombre: fila.nombre,
              apellido: fila.apellido,
              ci: ciLimpio,
              correo: correoInstitucional,
              estado: 'CREADO',
              ciPendiente,
              motivo: ciPendiente
                ? 'Cuenta creada con clave aleatoria (pendiente de CI)'
                : 'Cuenta y registro creados exitosamente',
            });
          } else if (yaEstabaVinculado) {
            omitidos++;
            estudiantes_reutilizados++;
            detalleFilas.push({
              fila: fila.fila,
              cod_sis: codSisLimpio,
              nombre: fila.nombre,
              apellido: fila.apellido,
              ci: estudiante.ci,
              correo: correoInstitucional,
              estado: 'OMITIDO',
              motivo:
                'Estudiante ya registrado y vinculado previamente al examen',
            });
          } else {
            // Estudiante reutilizado pero nuevo vínculo a examen
            creados++;
            estudiantes_reutilizados++;
            detalleFilas.push({
              fila: fila.fila,
              cod_sis: codSisLimpio,
              nombre: fila.nombre,
              apellido: fila.apellido,
              ci: estudiante.ci,
              correo: correoInstitucional,
              estado: 'CREADO',
              motivo: 'Estudiante existente vinculado al examen',
            });
          }
        });
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        this.logger.error(
          `Error procesando fila ${fila.fila} (${codSisLimpio}): ${errorMsg}`,
        );
        con_error++;
        rechazados.push({
          fila: fila.fila ?? 0,
          cod_sis: codSisLimpio,
          correo: correoInstitucional,
          motivo:
            'Error al registrar en base de datos. Se revirtió la transacción.',
        });
        detalleFilas.push({
          fila: fila.fila,
          cod_sis: codSisLimpio,
          nombre: fila.nombre,
          apellido: fila.apellido,
          ci: ciLimpio,
          correo: correoInstitucional,
          estado: 'ERROR',
          motivo: 'Error al registrar en base de datos.',
        });
      }
    }

    return {
      resumen: {
        total_filas: totalFilas,
        procesadas: filasValidas.length,
        rechazadas: rechazados.length,
        creados,
        omitidos,
        con_error,
        cuentas_creadas,
        estudiantes_creados: creados,
        estudiantes_reutilizados,
        vinculados_nuevos,
        ya_vinculados,
        pendientes_ci,
      },
      rechazados,
      avisos,
      detalleFilas,
      resultadosPorSis,
    };
  }

  create(_dto: unknown) {
    return 'This action adds a new cargasEstudiante';
  }

  findAll() {
    return 'This action returns all cargasEstudiantes';
  }

  findOne(id: number) {
    return `This action returns a #${id} cargasEstudiante`;
  }

  update(id: number, _dto: unknown) {
    return `This action updates a #${id} cargasEstudiante`;
  }

  remove(id: number) {
    return `This action removes a #${id} cargasEstudiante`;
  }
}
