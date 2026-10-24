import { render, screen } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { Sidebar } from '@/shared/components/layout/Sidebar';

jest.mock('next-auth/react', () => ({ useSession: jest.fn() }));
jest.mock('next/navigation', () => ({ usePathname: jest.fn() }));

const useSessionMock = useSession as jest.Mock;
const usePathnameMock = usePathname as jest.Mock;

function conPermisos(permisos?: string[]) {
  useSessionMock.mockReturnValue({
    status: 'authenticated',
    data: permisos ? { user: { permisos } } : null,
  });
}

describe('IT-PE-02: Sidebar + useUserPermissions muestran los módulos del estudiante', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    usePathnameMock.mockReturnValue('/colaboradores');
  });

  it('1. un estudiante ve solo el módulo "Mis exámenes" y apunta a /portal', () => {
    conPermisos(['portal_estudiante']);
    render(<Sidebar />);

    expect(screen.getByRole('link', { name: 'Mis exámenes' })).toHaveAttribute('href', '/portal');
    expect(screen.queryByRole('link', { name: 'Usuarios' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Roles' })).not.toBeInTheDocument();
  });

  it('2. un estudiante colaborador ve "Mis exámenes" y los módulos de colaborador', () => {
    conPermisos(['portal_estudiante', 'colaboradores.ver', 'colaboradores.crear']);
    render(<Sidebar />);

    expect(screen.getByRole('link', { name: 'Mis exámenes' })).toHaveAttribute('href', '/portal');
    expect(screen.getByRole('link', { name: 'Colaboradores' })).toHaveAttribute('href', '/colaboradores');
    expect(screen.queryByRole('link', { name: 'Usuarios' })).not.toBeInTheDocument();
  });

  it('3. un docente ve sus módulos y no ve "Mis exámenes"', () => {
    conPermisos(['examenes.ver', 'examenes.crear', 'estudiantes.ver']);
    render(<Sidebar />);

    expect(screen.getByRole('link', { name: 'Exámenes' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Estudiantes' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Mis exámenes' })).not.toBeInTheDocument();
  });

  it('4. sin permisos muestra "Sin módulos asignados"', () => {
    conPermisos([]);
    render(<Sidebar />);

    expect(screen.getByText('Sin módulos asignados')).toBeInTheDocument();
  });

  it('5. marca como activo el módulo de la ruta actual', () => {
    usePathnameMock.mockReturnValue('/portal');
    conPermisos(['portal_estudiante', 'colaboradores.ver']);
    render(<Sidebar />);

    expect(screen.getByRole('link', { name: 'Mis exámenes' })).toHaveClass('font-semibold');
    expect(screen.getByRole('link', { name: 'Colaboradores' })).not.toHaveClass('font-semibold');
  });
});