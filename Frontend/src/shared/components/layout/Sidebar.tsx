import Link from 'next/link';

export function Sidebar() {
  return (
    <aside className="w-60 shrink-0 border-r p-4 space-y-2">
      <Link href="/dashboard">Dashboard</Link>
      <Link href="/examenes">Exámenes</Link>
      <Link href="/usuarios">Usuarios</Link>
      <Link href="/roles">Roles</Link>
      <Link href="/ambientes">Ambientes</Link>
    </aside>
  );
}