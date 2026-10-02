"use client";

import { useParams } from "next/navigation";
import PatientRecord from "@/components/patients/patient-record";

export default function PatientDetailsPage() {
    const { userId } = useParams<{ userId: string }>();
    return <PatientRecord id={userId} />;
}
