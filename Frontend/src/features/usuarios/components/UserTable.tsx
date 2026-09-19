"use client";

import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/shared/components/ui/table";
import { UserTableRow } from "./UserTableRow";
import { UserCard } from "./UserCard";
import { UsuarioResumen } from "../types/user.types";

interface UserTableProps {
  users: UsuarioResumen[];
  isLoading: boolean;
  onEdit: (user: UsuarioResumen) => void;
  onDisable: (user: UsuarioResumen) => void;
}

const SKELETON_ROWS = 5;

export function UserTable({
  users,
  isLoading,
  onEdit,
  onDisable,
}: UserTableProps) {
  return (
    <>
      {/* Desktop / tablet: tabla normal */}
      <div className="hidden overflow-hidden rounded-xl border border-border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-label">Nombre</TableHead>
              <TableHead className="text-label">Rol</TableHead>
              <TableHead className="text-label">Correo</TableHead>
              <TableHead className="text-label text-right">Acción</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {isLoading &&
              Array.from({ length: SKELETON_ROWS }).map((_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  {Array.from({ length: 4 }).map((__, j) => (
                    <TableCell key={j}>
                      <div className="h-4 w-full max-w-[160px] animate-pulse rounded bg-muted" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}

            {!isLoading && users.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center">
                  <p className="text-body text-muted-foreground">
                    No hay usuarios registrados todavía.
                  </p>
                </TableCell>
              </TableRow>
            )}

            {!isLoading &&
              users.map((user) => (
                <UserTableRow
                  key={user.id}
                  user={user}
                  onEdit={onEdit}
                  onDisable={onDisable}
                />
              ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile: tarjetas apiladas */}
      <div className="flex flex-col gap-3 md:hidden">
        {isLoading &&
          Array.from({ length: SKELETON_ROWS }).map((_, i) => (
            <div
              key={`skeleton-card-${i}`}
              className="h-24 animate-pulse rounded-xl bg-muted"
            />
          ))}

        {!isLoading && users.length === 0 && (
          <p className="py-10 text-center text-body text-muted-foreground">
            No hay usuarios registrados todavía.
          </p>
        )}

        {!isLoading &&
          users.map((user) => (
            <UserCard
              key={user.id}
              user={user}
              onEdit={onEdit}
              onDisable={onDisable}
            />
          ))}
      </div>
    </>
  );
}