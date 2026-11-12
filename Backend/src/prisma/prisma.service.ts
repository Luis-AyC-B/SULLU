import { Injectable, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { auditContext } from '../auditoria/auditoria.prisma';

interface TransactionOptions {
  maxWait?: number;
  timeout?: number;
  isolationLevel?: Prisma.TransactionIsolationLevel;
}

interface TransactionRunner {
  <T>(
    callback: (tx: Prisma.TransactionClient) => Promise<T>,
    options?: TransactionOptions,
  ): Promise<T>;
  (
    operations: Prisma.PrismaPromise<unknown>[],
    options?: TransactionOptions,
  ): Promise<unknown[]>;
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    super();
    const transaction = this.$transaction.bind(
      this,
    ) as unknown as TransactionRunner;
    const contextoSql = () =>
      this
        .$queryRaw<unknown>`SELECT set_config('app.usuario_id', ${String(auditContext.getStore()?.usuarioId ?? '')}, true), set_config('app.ip', ${auditContext.getStore()?.ip ?? ''}, true)`;
    const configurar = (db: Prisma.TransactionClient) => db.$queryRaw`
      SELECT set_config('app.usuario_id', ${String(auditContext.getStore()?.usuarioId ?? '')}, true),
             set_config('app.ip', ${auditContext.getStore()?.ip ?? ''}, true)`;
    const extended = this.$extends({
      query: {
        $allModels: {
          async $allOperations({ operation, args, query }) {
            if (
              auditContext.getStore()?.enTransaccion ||
              !/^(create|update|upsert|delete)/.test(operation)
            ) {
              return query(args);
            }
            // La operación y su trigger comparten conexión y transacción.
            return auditContext.run(
              { ...auditContext.getStore(), enTransaccion: true },
              async () => {
                const resultados = await transaction([
                  contextoSql(),
                  query(args) as Prisma.PrismaPromise<unknown>,
                ]);
                return resultados[1];
              },
            );
          },
        },
      },
    });
    return new Proxy(this, {
      get(target, prop, receiver): unknown {
        if (prop === '$transaction') {
          return (
            input:
              | ((tx: Prisma.TransactionClient) => Promise<unknown>)
              | Prisma.PrismaPromise<unknown>[],
            options?: TransactionOptions,
          ) =>
            auditContext.run(
              { ...auditContext.getStore(), enTransaccion: true },
              () => {
                if (typeof input === 'function') {
                  return transaction(async (tx) => {
                    await configurar(tx);
                    return input(tx);
                  }, options);
                }
                return transaction([contextoSql(), ...input], options).then(
                  (resultados) => resultados.slice(1),
                );
              },
            );
        }
        if (
          typeof prop === 'string' &&
          !prop.startsWith('$') &&
          prop in extended &&
          !(prop in PrismaService.prototype)
        ) {
          return Reflect.get(extended, prop) as unknown;
        }
        const value: unknown = Reflect.get(target, prop, receiver);
        return typeof value === 'function'
          ? (value as (...args: unknown[]) => unknown).bind(target)
          : value;
      },
    });
  }
  async onModuleInit() {
    await this.$connect();
  }
}
