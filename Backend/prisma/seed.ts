import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function upsertUsuario(
  nombreRol: string,
  nombre: string,
  email: string,
  password: string,
) {
  const rol = await prisma.rol.upsert({
    where: { nombre: nombreRol },
    update: {},
    create: { nombre: nombreRol, permisos: {} },
  });

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.usuario.upsert({
    where: { email },
    update: {},
    create: { nombre, email, passwordHash, rolId: rol.id },
  });
}

async function main() {
  await upsertUsuario(
    'Administrador',
    'Administrador',
    'admin@exacontrol.com',
    'admin123',
  );
  await upsertUsuario(
    'Docente',
    'Docente de Prueba',
    'docente@exacontrol.com',
    'docente123',
  );
  await upsertUsuario(
    'Personal de control de ingreso',
    'Personal de Control de Prueba',
    'control@exacontrol.com',
    'control123',
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
