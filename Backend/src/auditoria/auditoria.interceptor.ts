import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Request } from 'express';
import { map, Observable } from 'rxjs';
import { auditContext } from './auditoria.prisma';

@Injectable()
export class AuditoriaInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context
      .switchToHttp()
      .getRequest<Request & { user?: { id?: number; usuarioId?: number } }>();
    const examen = req.path.match(/\/examenes\/(\d+)(\/desactivar)?\/?$/);
    const bajaExamenId =
      examen &&
      ((req.method === 'DELETE' && !examen[2]) ||
        (req.method === 'PATCH' && examen[2]))
        ? Number(examen[1])
        : undefined;
    return new Observable((subscriber) =>
      auditContext.run(
        {
          usuarioId: req.user?.id ?? req.user?.usuarioId,
          ip: req.ip?.slice(0, 45),
          bajaExamenId,
        },
        () =>
          next
            .handle()
            .pipe(
              map((respuesta: unknown) => {
                if (
                  bajaExamenId &&
                  respuesta &&
                  typeof respuesta === 'object' &&
                  'success' in respuesta &&
                  respuesta.success === true
                ) {
                  return {
                    ...respuesta,
                    message:
                      'El registro fue dado de baja; su información se conserva en la base de datos.',
                  };
                }
                return respuesta;
              }),
            )
            .subscribe(subscriber),
      ),
    );
  }
}
