import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { auditContext } from './auditoria.prisma';

@Injectable()
export class AuditoriaInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context
      .switchToHttp()
      .getRequest<Request & { user?: { id?: number; usuarioId?: number } }>();
    return new Observable((subscriber) =>
      auditContext.run(
        {
          usuarioId: req.user?.id ?? req.user?.usuarioId,
          ip: req.ip?.slice(0, 45),
        },
        () => next.handle().subscribe(subscriber),
      ),
    );
  }
}
