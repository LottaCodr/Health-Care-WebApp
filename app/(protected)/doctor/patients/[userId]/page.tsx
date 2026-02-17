"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import PatientDetailsComponent from "@/components/patients/patient-detail";
import { getPatientById } from "@/actions/front-desk/get.patients";
import { ArrowLeft, AlertTriangle, User } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";

export default function PatientDetailsPage() {
    const { userId } = useParams<{ userId: string }>();
    const [patient, setPatient] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        const fetchPatient = async () => {
            setLoading(true);
            setError(null);
            try {
                const patientData = await getPatientById(userId);
                if (!patientData) {
                    setError("Patient not found.");
                } else {
                    setPatient(patientData);
                }
            } catch (err) {
                setError("An error occurred while fetching the patient's details.");
            } finally {
                setLoading(false);
            }
        };

        if (userId) fetchPatient();
    }, [userId]);

    if (loading) {
        return (
            <div className="min-h-[60vh] flex flex-col justify-center items-center gap-3 py-14">
                <Spinner size="lg" />
                <span className="text-xl font-semibold text-blue-800 animate-pulse">Loading patient details...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-[50vh] flex flex-col justify-center items-center gap-4 py-16">
                <AlertTriangle className="text-yellow-600" size={48} />
                <div className="text-lg font-medium text-red-600">{error}</div>
                <Button onClick={() => router.back()} variant="ghost" className="gap-2 rounded-xl px-4">
                    <ArrowLeft size={18} /> Go Back
                </Button>
            </div>
        );
    }

    return (
        <div className=" mx-auto px-4 py-8">
            <div className="flex items-center gap-3 mb-8">
                <Button onClick={() => router.back()} variant="ghost" className="gap-2 rounded-xl px-3">
                    <ArrowLeft size={18} />
                </Button>
                <span className="flex items-center gap-2 text-blue-800 font-bold text-2xl">
                    <User size={24} /> Patient Details
                </span>
            </div>
            <div className="bg-background border border-border rounded-2xl p-6 shadow-lg">
                <PatientDetailsComponent patient={patient} />
            </div>
        </div>
    );
}
