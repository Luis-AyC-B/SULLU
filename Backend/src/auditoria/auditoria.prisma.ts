import { AsyncLocalStorage } from 'node:async_hooks';

interface AuditContext {
  usuarioId?: number;
  ip?: string;
  enTransaccion?: boolean;
}

export const auditContext = new AsyncLocalStorage<AuditContext>();
