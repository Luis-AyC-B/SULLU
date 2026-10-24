import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { RolesModule } from './roles/roles.module';
import { CargasEstudiantesModule } from './cargas-estudiantes/cargas-estudiantes.module';
import { PortalEstudianteModule } from './portal-estudiante/portal-estudiante.module';
import { EstudiantesModule } from './estudiantes/estudiantes.module';
import { AmbientesModule } from './ambientes/ambientes.module';
import { IncidenciasModule } from './incidencias/incidencias.module';
import { ExamenesModule } from './examenes/examenes.module';
import { CodigosQrModule } from './codigos-qr/codigos-qr.module';
import { IngresosModule } from './ingresos/ingresos.module';
import { RegistroIngresosModule } from './registro-ingresos/registro-ingresos.module';
import { HabilitacionesModule } from './habilitaciones/habilitaciones.module';
import { MailModule } from './mail/mail.module';
import { ReservasModule } from './reservas/reservas.module';
import { ColaboradoresModule } from './colaboradores/colaboradores.module';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { singleLine: true } }
            : undefined,
        level: process.env.LOG_LEVEL ?? 'info',
      },
    }),
    PrismaModule,
    AuthModule,
    HealthModule,
    MailModule,
    UsuariosModule,
    RolesModule,
    CargasEstudiantesModule,
    RegistroIngresosModule,
    EstudiantesModule,
    AmbientesModule,
    ReservasModule,
    IncidenciasModule,
    ExamenesModule,
    CodigosQrModule,
    PortalEstudianteModule,
    IngresosModule,
    HabilitacionesModule,
    ColaboradoresModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
