// app/(protected)/doctor/health-records/[patientId]/page.tsx

import PatientRecordPage from "@/components/doctor/health-record/PatientRecordPage";
import { getPatientById } from "@/lib/supabase-service";
import { notFound } from "next/navigation";

interface Props {
    params: Promise<{ patientId: string }>;
}

export default async function Page({ params }: Props) {
    const { patientId } = await params;          // ← await the params Promise
    const patient = await getPatientById(patientId);
    if (!patient) notFound();
    return <PatientRecordPage patient={patient} />;
}