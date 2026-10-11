import { StudentAuthGuard } from './StudentAuthGuard';
import { StudentExamsView } from './StudentExamsView';

export function PortalPageContainer() {
  return (
    <StudentAuthGuard>
      <StudentExamsView />
    </StudentAuthGuard>
  );
}