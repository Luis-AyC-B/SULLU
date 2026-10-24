import { PortalPageContainer } from "@/features/portal/components/PortalPageContainer";
import { StudentAuthGuard } from "@/features/portal/components/StudentAuthGuard";
import { ServiceWorkerRegister } from "@/features/portal/components/ServiceWorkerRegister";

export default function Page() {
  return (
    <>
      <ServiceWorkerRegister />
      <StudentAuthGuard>
        <PortalPageContainer />
      </StudentAuthGuard>
    </>
  );
}