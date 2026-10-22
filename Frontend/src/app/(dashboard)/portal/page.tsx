import { PortalPageContainer } from "@/features/portal/components/PortalPageContainer";
import { StudentAuthGuard } from "@/features/portal/components/StudentAuthGuard";

export default function Page() {
  return (
    <StudentAuthGuard>
      <PortalPageContainer />
    </StudentAuthGuard>
  );
}