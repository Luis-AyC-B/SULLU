/* eslint-disable prettier/prettier, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call */
/**
 * Dev: Gustavo Montaño
 * Date: 18/09/2026
 * Funcionalidad: Servicio core del módulo de roles. Ejecuta las reglas de negocio, validaciones de unicidad, restricciones de plantillas, catálogos de permisos y eliminación (HU3).
 * @param prisma - PrismaService inyectado para operar la base de datos
 * @return Objetos de tipo Rol formateados según contrato del frontend
 */
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateRolDto } from './dto/update-role.dto';
@Injectable()
export class RolesService {
  constructor(private prisma: PrismaService) {}

  async create(createRolDto: any) {
    const { nombre, permisos, descripcion } = createRolDto;

    // 1. Procesar permisos de forma segura (incluyendo la traducción de estudiantes.ver)
    const permisosConexion: any[] = [];
    if (permisos && Array.isArray(permisos)) {
      for (const p of permisos) {
        if (!p) continue;
        let claveOId: string | number = p;
        if (typeof p === 'object') {
          claveOId = p.clave || p.id || p.name;
        }

        // Traducción inversa para el frontend
        if (claveOId === 'estudiantes.ver_estudiantes') {
          claveOId = 'estudiantes.ver';
        }

        if (typeof claveOId === 'number' || !isNaN(Number(claveOId))) {
          permisosConexion.push({ permiso: { connect: { id: Number(claveOId) } } });
        } else if (typeof claveOId === 'string' && claveOId.trim() !== '') {
          permisosConexion.push({ permiso: { connect: { clave: String(claveOId) } } });
        }
      }
    }

    // 2. Buscar si ya existe un rol con ese nombre, INCLUYENDO los que fueron eliminados (Soft Delete)
    const rolExistente = await this.prisma.rol.findFirst({
      where: { nombre },
    });

    if (rolExistente) {
      // Si el rol existe y está ACTIVO, bloqueamos la creación con un error 400
      if (rolExistente.deletedAt === null) {
        throw new BadRequestException('Ya existe un rol con este nombre');
      } 
      // Si el rol existe pero fue ELIMINADO (Soft Delete), lo REACTIVAMOS
      else {
        // A. Limpiamos los permisos viejos de ese rol
        await this.prisma.rol_Permiso.deleteMany({
          where: { rolId: rolExistente.id },
        });

        // B. Lo resucitamos quitando el deletedAt y le ponemos los nuevos datos
        const rolReactivado = await this.prisma.rol.update({
          where: { id: rolExistente.id },
          data: {
            descripcion,
            deletedAt: null, // ¡Esto lo vuelve a hacer visible!
            permisos: {
              create: permisosConexion,
            },
          },
          include: {
            usuarios: true,
            permisos: { include: { permiso: true } },
          },
        });

        return this.mapToFrontendRol(rolReactivado);
      }
    }

    // 3. Si el nombre no existe en absoluto en la BD, lo creamos de cero
    try {
      const nuevoRol = await this.prisma.rol.create({
        data: {
          nombre,
          descripcion,
          esPlantilla: false,
          permisos: {
            create: permisosConexion,
          },
        },
        include: {
          usuarios: true,
          permisos: {
            include: { permiso: true },
          },
        },
      });

      return this.mapToFrontendRol(nuevoRol);
    } catch (error: any) {
      // Resguardo final: Si la base de datos lanza un error de unicidad (P2002), lo transformamos en un error 400 amigable
      if (error.code === 'P2002') {
        throw new BadRequestException('El nombre del rol ya está en uso');
      }
      throw error;
    }
  }

  async findAll() {
    // Excluir los roles que tengan fecha de eliminación lógica (Soft Delete)
    const roles = await this.prisma.rol.findMany({
      where: { deletedAt: null },
      include: {
        usuarios: true,
        permisos: { include: { permiso: true } },
      },
    });

    return roles.map((rol: any) => this.mapToFrontendRol(rol));
  }
  async update(id: number, updateRolDto: UpdateRolDto) {
    const rol = await this.prisma.rol.findUnique({ where: { id } });
    if (!rol) throw new NotFoundException('Rol no encontrado');
    if (rol.esPlantilla) {
      throw new BadRequestException('Los roles base del sistema no se pueden modificar.');
    }

    if (updateRolDto.nombre && updateRolDto.nombre.toLowerCase() !== rol.nombre.toLowerCase()) {
      const duplicado = await this.prisma.rol.findFirst({
        where: { nombre: { equals: updateRolDto.nombre, mode: 'insensitive' } },
      });
      if (duplicado) throw new BadRequestException('Ya existe un rol con este nombre');
    }

    const rolActualizado = await this.prisma.$transaction(async (tx: any) => {
      if (updateRolDto.permisos) {
        await tx.rol_Permiso.deleteMany({ where: { rolId: id } });
      }

      return tx.rol.update({
        where: { id },
        data: {
          nombre: updateRolDto.nombre,
          descripcion: updateRolDto.descripcion,
          ...(updateRolDto.permisos && {
            permisos: {
              create: updateRolDto.permisos.map((clave: string) => ({ permiso: { connect: { clave } } })),
            },
          }),
        },
        include: { usuarios: true, permisos: { include: { permiso: true } } },
      });
    });

    return this.mapToFrontendRol(rolActualizado);
  }

  async remove(id: number) {
    const rol = await this.prisma.rol.findUnique({ 
      where: { id },
      include: { _count: { select: { usuarios: true } } }
    });

    if (!rol || rol.deletedAt) throw new NotFoundException('Rol no encontrado');
    if (rol.esPlantilla) throw new BadRequestException('No se pueden eliminar roles base del sistema');
    if (rol._count.usuarios > 0) {
      throw new BadRequestException('Debe reasignar a los usuarios antes de eliminar el rol');
    }

    // Aplicar Soft Delete marcando la fecha actual en lugar de borrar físicamente el registro
    await this.prisma.rol.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { success: true };
  }

  async getModulosConPermisos() {
    // Consulta dinámica directamente de las tablas Modulo y Permiso en la BD
    const modulosDb = await this.prisma.modulo.findMany({
      include: {
        permisos: true,
      },
    });

    return modulosDb.map((mod: any) => ({
      clave: mod.nombre.toLowerCase(),
      label: mod.nombre.toUpperCase(),
      permisoVer: {
        clave: `${mod.nombre.toLowerCase()}.ver`,
        label: `Ver ${mod.nombre.toLowerCase()}`,
      },
      acciones: mod.permisos.map((p: any) => {
        // Excepción: Forzamos que 'estudiantes.ver' pase con una clave que el frontend no filtre
        if (p.clave === 'estudiantes.ver') {
          return {
            clave: 'estudiantes.ver_estudiantes',
            label: 'Ver estudiantes',
          };
        }

        // Ocultamos los demás permisos '.ver' de la lista de acciones secundarias
        if (p.clave.endsWith('.ver')) {
          return null;
        }

        return {
          clave: p.clave,
          label: p.clave.split('.')[1] 
            ? p.clave.split('.')[1].charAt(0).toUpperCase() + p.clave.split('.')[1].slice(1) 
            : p.clave,
        };
      }).filter(Boolean), // Elimina los valores nulos
    }));
  }

  async getPlantillasBase() {
    const plantillas = await this.prisma.rol.findMany({
      where: { esPlantilla: true },
      include: { permisos: { include: { permiso: true } } },
    });
    return plantillas.map((p: any) => this.mapToFrontendRol(p));
  }

  private mapToFrontendRol(rol: any) {
    const esPlantilla = Boolean(rol.esPlantilla);
    const nombreLower = rol.nombre.toLowerCase();

    let colorBadge = 'gray';
    if (nombreLower.includes('administrador')) {
      colorBadge = 'blue';
    } else if (nombreLower.includes('docente')) {
      colorBadge = 'red';
    } else if (nombreLower.includes('control') || nombreLower.includes('ingreso')) {
      colorBadge = 'green';
    }

    return {
      id: rol.id.toString(),
      nombre: rol.nombre,
      descripcion: rol.descripcion || '',
      esPlantilla: esPlantilla,
      editable: !esPlantilla,
      isEditable: !esPlantilla,
      canEdit: !esPlantilla,
      deletable: !esPlantilla,
      canDelete: !esPlantilla,
      colorBadge: colorBadge,
      usuariosAsignados: rol.usuarios ? rol.usuarios.length : 0,
      permisos: rol.permisos ? rol.permisos.map((rp: any) => rp.permiso.clave) : [],
    };
  }
}