import { ProfilePageContainer } from '@/features/portal/components/ProfilePageContainer';
import { StudentAuthGuard } from '@/features/portal/components/StudentAuthGuard';

export default function PortalPerfilPage() {
  return (
    <StudentAuthGuard requierePerfilCompleto={false}>
      <ProfilePageContainer />
    </StudentAuthGuard>
  );
}