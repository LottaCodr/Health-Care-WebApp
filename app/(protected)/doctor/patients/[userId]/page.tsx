"use client";

import { useParams } from "next/navigation";
import PatientDetailsComponent from "@/components/patients/patient-detail";
import { usePatient } from "@/hooks/emr/use-patients";

export default function PatientDetailsPage() {
    const { userId } = useParams<{ userId: string }>();
    const { data: patient, isPending, error } = usePatient(userId);

    if (isPending) {
        return (
            <div className="flex flex-col gap-4 justify-center items-center text-center min-h-[250px]">
                <span className="inline-block animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-600 border-opacity-80" aria-label="Loading">
                    {/* empty, spinner is circular border */}
                </span>
                <span className="text-lg text-primary font-medium sr-only">Loading patient details...</span>
            </div>
        );
    }

    if (error || !patient) {
        return <div>Patient not found.</div>;
    }

    return <PatientDetailsComponent patient={patient} />;
}
