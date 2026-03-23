import PatientRecordPage from "@/components/doctor/health-record/PatientRecordPage";
import { getPatientById } from "@/lib/supabase-service";
import { notFound } from "next/navigation";

interface Props { params: { patientId: string } }

export default async function Page({ params }: Props) {
    const patient = await getPatientById(params.patientId);
    if (!patient) notFound();
    return <PatientRecordPage patient={patient} />;
}