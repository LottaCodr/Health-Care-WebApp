import { redirect } from "next/navigation";
import { getCurrentPortalPatient } from "@/lib/services/portal.service";

export default async function PortalRoot() {
    const patient = await getCurrentPortalPatient();
    redirect(patient ? "/portal/dashboard" : "/portal/login");
}
