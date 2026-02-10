"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/context/auth-provider";
import { useRoleProtection } from "@/lib/role-utils";
import { UserRole } from "@/types/models";
import {
    usePatient,
    useConsultationsByPatient,
    useLabRequestsByPatient,
    useNursingActionsByPatient,
    useDispensingRecordsByPatient,
    usePaymentsByPatient,
} from "@/hooks/use-emr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSkeleton, ErrorAlert, EmptyState } from "@/components/emr-ui";
import { ArrowLeft, Calendar, Pill, Beaker, Heart, DollarSign, CheckCircle2 } from "lucide-react";
import Link from "next/link";

interface TimelineEvent {
    id: string;
    type: "registration" | "consultation" | "lab" | "nursing" | "pharmacy" | "payment";
    title: string;
    description: string;
    timestamp: string;
    status: string;
    icon: React.ReactNode;
}

export default function PatientTimeline() {
    const params = useParams();
    const patientId = params.id as string;

    const { authorized, loading: roleLoading } = useRoleProtection([
        UserRole.Doctor,
        UserRole.Nurse,
        UserRole.LabTechnician,
        UserRole.Pharmacist,
        UserRole.Admin,
    ]);

    const { data: patient, loading: patientLoading } = usePatient(patientId);
    const { data: consultations, loading: consultLoading } = useConsultationsByPatient(patientId);
    const { data: labRequests, loading: labLoading } = useLabRequestsByPatient(patientId);
    const { data: nursingActions, loading: nursingLoading } = useNursingActionsByPatient(patientId);
    const { data: dispensingRecords, loading: dispensingLoading } = useDispensingRecordsByPatient(patientId);
    const { data: payments, loading: paymentLoading } = usePaymentsByPatient(patientId);

    const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (
            !patientLoading &&
            !consultLoading &&
            !labLoading &&
            !nursingLoading &&
            !dispensingLoading &&
            !paymentLoading
        ) {
            const events: TimelineEvent[] = [];

            // Registration event
            if (patient) {
                events.push({
                    id: patient.$id,
                    type: "registration",
                    title: "Patient Registered",
                    description: `${patient.name} registered in the system`,
                    timestamp: patient.$createdAt,
                    status: "Completed",
                    icon: <Calendar className="h-5 w-5" />,
                });
            }

            // Consultation events
            if (consultations) {
                consultations.forEach((consultation: any) => {
                    events.push({
                        id: consultation.$id,
                        type: "consultation",
                        title: "Consultation",
                        description: `Symptoms: ${consultation.symptoms}. Diagnosis: ${consultation.diagnosis}`,
                        timestamp: consultation.$createdAt,
                        status: consultation.status,
                        icon: <Heart className="h-5 w-5" />,
                    });
                });
            }

            // Lab request events
            if (labRequests) {
                labRequests.forEach((labRequest: any) => {
                    events.push({
                        id: labRequest.$id,
                        type: "lab",
                        title: `Lab Test: ${labRequest.testType}`,
                        description: labRequest.testDescription,
                        timestamp: labRequest.$createdAt,
                        status: labRequest.status,
                        icon: <Beaker className="h-5 w-5" />,
                    });
                });
            }

            // Nursing action events
            if (nursingActions) {
                nursingActions.forEach((action: any) => {
                    events.push({
                        id: action.$id,
                        type: "nursing",
                        title: `Nursing: ${action.actionType}`,
                        description: action.description,
                        timestamp: action.$createdAt,
                        status: action.status,
                        icon: <Heart className="h-5 w-5" />,
                    });
                });
            }

            // Pharmacy dispensing events
            if (dispensingRecords) {
                dispensingRecords.forEach((record: any) => {
                    events.push({
                        id: record.$id,
                        type: "pharmacy",
                        title: "Medication Dispensed",
                        description: `${record.dispensedMedications?.length || 0} medications dispensed`,
                        timestamp: record.$createdAt,
                        status: "Completed",
                        icon: <Pill className="h-5 w-5" />,
                    });
                });
            }

            // Payment events
            if (payments) {
                payments.forEach((payment: any) => {
                    events.push({
                        id: payment.$id,
                        type: "payment",
                        title: "Payment Processed",
                        description: `₦${payment.amount} via ${payment.paymentMethod}`,
                        timestamp: payment.$createdAt,
                        status: payment.status,
                        icon: <DollarSign className="h-5 w-5" />,
                    });
                });
            }

            // Sort by timestamp (newest first)
            events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

            setTimeline(events);
            setLoading(false);
        }
    }, [
        patient,
        consultations,
        labRequests,
        nursingActions,
        dispensingRecords,
        payments,
        patientLoading,
        consultLoading,
        labLoading,
        nursingLoading,
        dispensingLoading,
        paymentLoading,
    ]);

    if (roleLoading || loading) return <LoadingSkeleton />;

    if (!authorized) {
        return <ErrorAlert message="Unauthorized access." />;
    }

    if (!patient) {
        return <ErrorAlert message="Patient not found" />;
    }

    const getStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case "completed":
                return "text-green-600";
            case "pending":
            case "scheduled":
                return "text-yellow-600";
            case "inprogress":
                return "text-blue-600";
            case "failed":
            case "cancelled":
                return "text-red-600";
            default:
                return "text-gray-600";
        }
    };

    const getStatusBgColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case "completed":
                return "bg-green-100";
            case "pending":
            case "scheduled":
                return "bg-yellow-100";
            case "inprogress":
                return "bg-blue-100";
            case "failed":
            case "cancelled":
                return "bg-red-100";
            default:
                return "bg-gray-100";
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-6 flex items-center gap-4">
                    <Link href="/doctor/dashboard">
                        <button className="p-2 hover:bg-gray-200 rounded-lg transition">
                            <ArrowLeft className="h-5 w-5" />
                        </button>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Patient Timeline</h1>
                        <p className="text-gray-600 mt-1">{patient.name}</p>
                    </div>
                </div>

                {/* Patient Summary */}
                <Card className="mb-8">
                    <CardHeader>
                        <CardTitle>Patient Information</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <p className="text-sm text-gray-600">Name</p>
                            <p className="font-semibold text-gray-900">{patient.name}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Contact</p>
                            <p className="font-semibold text-gray-900">{patient.phone}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Current Status</p>
                            <span
                                className={`inline-block px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800`}
                            >
                                {patient.status}
                            </span>
                        </div>
                    </CardContent>
                </Card>

                {/* Timeline */}
                <Card>
                    <CardHeader>
                        <CardTitle>Medical History & Timeline</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {timeline.length === 0 ? (
                            <EmptyState title="No events" description="No medical events recorded yet" />
                        ) : (
                            <div className="space-y-6">
                                {timeline.map((event, index) => (
                                    <div key={event.id} className="flex gap-4">
                                        {/* Timeline marker */}
                                        <div className="flex flex-col items-center">
                                            <div
                                                className={`p-3 rounded-full ${getStatusBgColor(event.status)}`}
                                            >
                                                <div className={getStatusColor(event.status)}>
                                                    {event.icon}
                                                </div>
                                            </div>
                                            {index < timeline.length - 1 && (
                                                <div className="w-0.5 h-12 bg-gray-300 mt-2" />
                                            )}
                                        </div>

                                        {/* Event details */}
                                        <div className="flex-1 pb-4">
                                            <div className="bg-white p-4 rounded-lg border border-gray-200">
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <h3 className="font-semibold text-gray-900">
                                                            {event.title}
                                                        </h3>
                                                        <p className="text-sm text-gray-600 mt-1">
                                                            {event.description}
                                                        </p>
                                                    </div>
                                                    <span
                                                        className={`px-2 py-1 rounded text-xs font-medium ${getStatusBgColor(
                                                            event.status
                                                        )} ${getStatusColor(event.status)}`}
                                                    >
                                                        {event.status}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-500 mt-3">
                                                    {new Date(event.timestamp).toLocaleString()}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
