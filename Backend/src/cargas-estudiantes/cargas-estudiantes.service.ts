import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { FilaEstudianteCsv, FilaRechazada } from './cargas-estudiantes.parser';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

export interface FilaAviso {
  fila?: number;
  cod_sis: string;
  correo?: string;
  motivo: string;
}

export interface FilaCorreoFallido {
  cod_sis: string;
  correo: string;
  motivo: string;
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
    cuentas_creadas: number;
    estudiantes_creados: number;
    estudiantes_reutilizados: number;
    vinculados_nuevos: number;
    ya_vinculados: number;
    correos_enviados: number;
    correos_fallidos: number;
  };
  rechazados: FilaRechazada[];
  avisos: FilaAviso[];
  correos_fallidos: FilaCorreoFallido[];
  resultadosPorSis: Map<string, InfoEstudianteProcesado>;
}

@Injectable()
export class CargasEstudiantesService {
  private readonly logger = new Logger(CargasEstudiantesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

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

  async procesarEstudiantesParaExamen(
    examenId: number,
    filasValidas: FilaEstudianteCsv[],
    totalFilas: number,
    rechazadosIniciales: FilaRechazada[] = [],
  ): Promise<ResultadoProcesamientoEstudiantes> {
    const rechazados: FilaRechazada[] = [...rechazadosIniciales];
    const avisos: FilaAviso[] = [];
    const correosFallidos: FilaCorreoFallido[] = [];
    const resultadosPorSis = new Map<string, InfoEstudianteProcesado>();

    let cuentas_creadas = 0;
    let estudiantes_reutilizados = 0;
    let vinculados_nuevos = 0;
    let ya_vinculados = 0;
    let correos_enviados = 0;

    if (filasValidas.length === 0) {
      return {
        resumen: {
          total_filas: totalFilas,
          procesadas: 0,
          rechazadas: rechazados.length,
          cuentas_creadas: 0,
          estudiantes_creados: 0,
          estudiantes_reutilizados: 0,
          vinculados_nuevos: 0,
          ya_vinculados: 0,
          correos_enviados: 0,
          correos_fallidos: 0,
        },
        rechazados,
        avisos,
        correos_fallidos: correosFallidos,
        resultadosPorSis,
      };
    }

    // 1. Asegurar rol Estudiante
    const rolEstudiante = await this.prisma.rol.upsert({
      where: { nombre: 'Estudiante' },
      update: {},
      create: {
        nombre: 'Estudiante',
        descripcion: 'Estudiante con acceso al portal de exámenes',
      },
    });

    // 2. Preconsulta masiva
    const codigosSis = filasValidas.map((f) => f.cod_sis);
    const correos = filasValidas
      .map((f) => f.correo?.toLowerCase())
      .filter((c): c is string => Boolean(c));

    const [estudiantesExistentes, usuariosExistentes] = await Promise.all([
      this.prisma.estudiante.findMany({
        where: { cod_sis: { in: codigosSis } },
        include: { usuario: true },
      }),
      this.prisma.usuario.findMany({
        where: { correo: { in: correos } },
        include: { estudiante: true },
      }),
    ]);

    const mapaEstudiantes = new Map(
      estudiantesExistentes.map((e) => [e.cod_sis, e]),
    );
    const mapaUsuarios = new Map(
      usuariosExistentes.map((u) => [u.correo!.toLowerCase(), u]),
    );

    // 3. Preparación de filas y hashing antes de abrir transacción
    interface FilaPreparada {
      filaOriginal: FilaEstudianteCsv;
      accion:
        | 'NUEVO_CON_CUENTA'
        | 'NUEVO_SIN_CUENTA'
        | 'REUTILIZAR'
        | 'CREAR_USUARIO_EXISTENTE';
      estudianteId?: number;
      passwordPlana?: string;
      passwordHash?: string;
    }

    const filasPreparadas: FilaPreparada[] = [];

    for (const fila of filasValidas) {
      const estExistente = mapaEstudiantes.get(fila.cod_sis);
      const userConCorreo = fila.correo
        ? mapaUsuarios.get(fila.correo.toLowerCase())
        : null;

      if (estExistente) {
        if (estExistente.usuario) {
          const correoActual = estExistente.usuario.correo?.toLowerCase();
          if (
            fila.correo &&
            correoActual &&
            correoActual !== fila.correo.toLowerCase()
          ) {
            avisos.push({
              fila: fila.fila,
              cod_sis: fila.cod_sis,
              correo: fila.correo,
              motivo: `El código ${fila.cod_sis} ya tiene registrado el correo '${estExistente.usuario.correo}'. Se mantuvo su cuenta actual y se vinculó al examen.`,
            });
          }
          filasPreparadas.push({
            filaOriginal: fila,
            accion: 'REUTILIZAR',
            estudianteId: estExistente.id,
          });
        } else {
          // Estudiante existe pero sin cuenta de Usuario
          if (!fila.correo) {
            avisos.push({
              fila: fila.fila,
              cod_sis: fila.cod_sis,
              motivo: 'Falta correo institucional; no se creó cuenta',
            });
            filasPreparadas.push({
              filaOriginal: fila,
              accion: 'REUTILIZAR',
              estudianteId: estExistente.id,
            });
          } else if (
            userConCorreo &&
            userConCorreo.estudiante?.cod_sis !== fila.cod_sis
          ) {
            rechazados.push({
              fila: fila.fila ?? 0,
              cod_sis: fila.cod_sis,
              correo: fila.correo,
              motivo:
                'El correo institucional ya está registrado por otro usuario',
            });
          } else {
            const passwordPlana = crypto
              .randomBytes(8)
              .toString('base64url')
              .slice(0, 10);
            const passwordHash = await bcrypt.hash(passwordPlana, 10);
            filasPreparadas.push({
              filaOriginal: fila,
              accion: 'CREAR_USUARIO_EXISTENTE',
              estudianteId: estExistente.id,
              passwordPlana,
              passwordHash,
            });
          }
        }
      } else {
        // Estudiante nuevo
        if (!fila.correo) {
          avisos.push({
            fila: fila.fila,
            cod_sis: fila.cod_sis,
            motivo: 'Falta correo institucional; no se creó cuenta',
          });
          filasPreparadas.push({
            filaOriginal: fila,
            accion: 'NUEVO_SIN_CUENTA',
          });
        } else if (userConCorreo) {
          rechazados.push({
            fila: fila.fila ?? 0,
            cod_sis: fila.cod_sis,
            correo: fila.correo,
            motivo:
              'El correo institucional ya está registrado por otro usuario',
          });
        } else {
          const passwordPlana = crypto
              .randomBytes(8)
              .toString('base64url')
              .slice(0, 10);
          const passwordHash = await bcrypt.hash(passwordPlana, 10);
          filasPreparadas.push({
            filaOriginal: fila,
            accion: 'NUEVO_CON_CUENTA',
            passwordPlana,
            passwordHash,
          });
        }
      }
    }

    // 4. Procesamiento por lotes de 50
    const TAMANO_LOTE = 50;
    const credencialesParaEnviar: Array<{
      codSis: string;
      correo: string;
      nombre: string;
      passwordPlana: string;
    }> = [];

    for (let i = 0; i < filasPreparadas.length; i += TAMANO_LOTE) {
      const lote = filasPreparadas.slice(i, i + TAMANO_LOTE);

      let loteCuentasCreadas = 0;
      let loteEstudiantesReutilizados = 0;
      let loteVinculadosNuevos = 0;
      let loteYaVinculados = 0;
      const loteCredenciales: Array<{
        codSis: string;
        correo: string;
        nombre: string;
        passwordPlana: string;
      }> = [];
      const loteResultados = new Map<string, InfoEstudianteProcesado>();

      try {
        await this.prisma.$transaction(
          async (tx) => {
            for (const item of lote) {
              const { filaOriginal, accion, passwordHash, passwordPlana } =
                item;
              let estId = item.estudianteId;

              if (accion === 'NUEVO_CON_CUENTA') {
                const usuario = await tx.usuario.create({
                  data: {
                    nombre: filaOriginal.nombre,
                    apellido: filaOriginal.apellido,
                    correo: filaOriginal.correo,
                    password: passwordHash!,
                    roles: { create: [{ rolId: rolEstudiante.id }] },
                  },
                });

                const estudiante = await tx.estudiante.create({
                  data: {
                    cod_sis: filaOriginal.cod_sis,
                    nombre: filaOriginal.nombre,
                    apellido: filaOriginal.apellido,
                    ci: filaOriginal.ci,
                    usuarioId: usuario.id,
                  },
                });

                estId = estudiante.id;
                loteCuentasCreadas++;
                loteCredenciales.push({
                  codSis: filaOriginal.cod_sis,
                  correo: filaOriginal.correo!,
                  nombre:
                    `${filaOriginal.nombre} ${filaOriginal.apellido}`.trim(),
                  passwordPlana: passwordPlana!,
                });
              } else if (accion === 'NUEVO_SIN_CUENTA') {
                const estudiante = await tx.estudiante.create({
                  data: {
                    cod_sis: filaOriginal.cod_sis,
                    nombre: filaOriginal.nombre,
                    apellido: filaOriginal.apellido,
                    ci: filaOriginal.ci,
                    usuarioId: null,
                  },
                });
                estId = estudiante.id;
              } else if (accion === 'CREAR_USUARIO_EXISTENTE') {
                const usuario = await tx.usuario.create({
                  data: {
                    nombre: filaOriginal.nombre,
                    apellido: filaOriginal.apellido,
                    correo: filaOriginal.correo,
                    password: passwordHash!,
                    roles: { create: [{ rolId: rolEstudiante.id }] },
                  },
                });

                await tx.estudiante.update({
                  where: { id: estId },
                  data: { usuarioId: usuario.id },
                });

                loteCuentasCreadas++;
                loteCredenciales.push({
                  codSis: filaOriginal.cod_sis,
                  correo: filaOriginal.correo!,
                  nombre:
                    `${filaOriginal.nombre} ${filaOriginal.apellido}`.trim(),
                  passwordPlana: passwordPlana!,
                });
              } else {
                loteEstudiantesReutilizados++;
              }

              // Vinculación a examen
              const vinculo = await tx.examen_Estudiante.findUnique({
                where: {
                  estudianteId_examenId: { estudianteId: estId!, examenId },
                },
              });

              if (vinculo) {
                loteYaVinculados++;
                loteResultados.set(filaOriginal.cod_sis, {
                  estudianteId: estId!,
                  estado_habilitado: vinculo.estado_habilitado,
                  ya_vinculado: true,
                });
              } else {
                const nuevoVinculo = await tx.examen_Estudiante.create({
                  data: {
                    estudianteId: estId!,
                    examenId,
                    estado_habilitado: true,
                  },
                });
                loteVinculadosNuevos++;
                loteResultados.set(filaOriginal.cod_sis, {
                  estudianteId: estId!,
                  estado_habilitado: nuevoVinculo.estado_habilitado,
                  ya_vinculado: false,
                });
              }
            }
          },
          { timeout: 30000, maxWait: 10000 },
        );

        cuentas_creadas += loteCuentasCreadas;
        estudiantes_reutilizados += loteEstudiantesReutilizados;
        vinculados_nuevos += loteVinculadosNuevos;
        ya_vinculados += loteYaVinculados;
        credencialesParaEnviar.push(...loteCredenciales);
        for (const [sis, info] of loteResultados.entries()) {
          resultadosPorSis.set(sis, info);
        }
      } catch (err: unknown) {
        const detalle = err instanceof Error ? err.message : String(err);
        this.logger.error(`Error en lote de carga: ${detalle}`);
        for (const item of lote) {
          rechazados.push({
            fila: item.filaOriginal.fila ?? 0,
            cod_sis: item.filaOriginal.cod_sis,
            correo: item.filaOriginal.correo,
            motivo: 'No se pudo guardar, reintente',
          });
        }
      }
    }

    // 5. Envío de correos post-transacción con concurrencia máxima de 5
    await this.ejecutarConConcurrencia(
      credencialesParaEnviar,
      5,
      async (cred) => {
        try {
          await this.mailService.enviarCredencialesEstudiante(
            cred.correo,
            cred.passwordPlana,
            cred.nombre,
            cred.codSis,
          );
          correos_enviados++;
        } catch (err: unknown) {
          const detalle = err instanceof Error ? err.message : String(err);
          correosFallidos.push({
            cod_sis: cred.codSis,
            correo: cred.correo,
            motivo: detalle,
          });

          try {
            await this.prisma.bitacora_Auditoria.create({
              data: {
                accion: 'CORREO_CREDENCIALES_FALLIDO',
                modulo: 'Cargas Estudiantes',
                detallesNuevo: {
                  cod_sis: cred.codSis,
                  correo: cred.correo,
                  error: detalle,
                },
              },
            });
          } catch (auditErr: unknown) {
            const auditDetalle =
              auditErr instanceof Error ? auditErr.message : String(auditErr);
            this.logger.error(
              `Error al registrar bitácora de correo fallido: ${auditDetalle}`,
            );
          }
        }
      },
    );

    return {
      resumen: {
        total_filas: totalFilas,
        procesadas: filasPreparadas.length,
        rechazadas: rechazados.length,
        cuentas_creadas,
        estudiantes_creados: cuentas_creadas,
        estudiantes_reutilizados,
        vinculados_nuevos,
        ya_vinculados,
        correos_enviados,
        correos_fallidos: correosFallidos.length,
      },
      rechazados,
      avisos,
      correos_fallidos: correosFallidos,
      resultadosPorSis,
    };
  }

  private async ejecutarConConcurrencia<T>(
    items: T[],
    limite: number,
    fn: (item: T) => Promise<void>,
  ): Promise<void> {
    const cola = [...items];
    const trabajadores: Promise<void>[] = [];

    const trabajador = async () => {
      while (cola.length > 0) {
        const item = cola.shift();
        if (item === undefined) break;
        await fn(item);
      }
    };

    for (let i = 0; i < Math.min(limite, items.length); i++) {
      trabajadores.push(trabajador());
    }

    await Promise.all(trabajadores);
  }
}
