"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
// import { getPatientById } from "@/actions/front-desk/get.patients";
import PatientDetailsComponent from "@/components/patients/patient-detail";
import Loading from "@/app/useloading";
import { getPatientById } from "@/actions/front-desk/patients";

export default function PatientDetailsPage() {
    const { userId } = useParams<{ userId: string }>();
    const [patient, setPatient] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPatient = async () => {
            const patientData = await getPatientById(userId);
            setPatient(patientData);
            setLoading(false);
        };

        if (userId) {
            fetchPatient();
        }
    }, [userId]);

    if (loading) return <div className="flex gap-4 justify-center items-center text-center"><Loading /> Loading patient details...</div>;

    if (!patient) return <div>Patient not found.</div>;

    return <PatientDetailsComponent patient={patient} />;
}
