"use client";

import { useParams } from "next/navigation";
import PatientRecord from "@/components/patients/patient-record";

export default function PatientDetailsPage() {
    const { id } = useParams<{ id: string }>();
    return <PatientRecord id={id} />;
}
