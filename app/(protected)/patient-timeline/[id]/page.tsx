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
import { ArrowLeft, Calendar, Pill, Beaker, Heart, DollarSign } from "lucide-react";
import Link from "next/link";
import { PremiumLayout } from "@/components/layout/PremiumLayout";

export default function PatientTimelinePage() {
    return (
        <PremiumLayout>
            <PatientTimeline />
        </PremiumLayout>
    );
}

function PatientTimeline() {
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

    const [timeline, setTimeline] = useState<any[]>([]);
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
            const events: any[] = [];

            // Registration event
            if (patient) {
                events.push({
                    id: patient.id || patient.$id,
                    type: "registration",
                    title: "Patient Registered",
                    description: `${patient.name} registered in the system`,
                    timestamp: patient.created_at || patient.$createdAt,
                    status: "Completed",
                    icon: <Calendar className="h-5 w-5" />,
                });
            }

            // Consultation events
            if (consultations) {
                consultations.forEach((consultation: any) => {
                    events.push({
                        id: consultation.id || consultation.$id,
                        type: "consultation",
                        title: "Consultation",
                        description: `Symptoms: ${consultation.symptoms}. Diagnosis: ${consultation.diagnosis}`,
                        timestamp: consultation.created_at || consultation.$createdAt,
                        status: consultation.status,
                        icon: <Heart className="h-5 w-5" />,
                    });
                });
            }

            // Lab request events
            if (labRequests) {
                labRequests.forEach((labRequest: any) => {
                    events.push({
                        id: labRequest.id || labRequest.$id,
                        type: "lab",
                        title: `Lab Test: ${labRequest.testType}`,
                        description: labRequest.testDescription,
                        timestamp: labRequest.created_at || labRequest.$createdAt,
                        status: labRequest.status,
                        icon: <Beaker className="h-5 w-5" />,
                    });
                });
            }

            // Nursing action events
            if (nursingActions) {
                nursingActions.forEach((action: any) => {
                    events.push({
                        id: action.id || action.$id,
                        type: "nursing",
                        title: `Nursing: ${action.actionType}`,
                        description: action.description,
                        timestamp: action.created_at || action.$createdAt,
                        status: action.status,
                        icon: <Heart className="h-5 w-5" />,
                    });
                });
            }

            // Pharmacy dispensing events
            if (dispensingRecords) {
                dispensingRecords.forEach((record: any) => {
                    events.push({
                        id: record.id || record.$id,
                        type: "pharmacy",
                        title: "Medication Dispensed",
                        description: `${record.dispensedMedications?.length || 0} medications dispensed`,
                        timestamp: record.created_at || record.$createdAt,
                        status: "Completed",
                        icon: <Pill className="h-5 w-5" />,
                    });
                });
            }

            // Payment events
            if (payments) {
                payments.forEach((payment: any) => {
                    events.push({
                        id: payment.id || payment.$id,
                        type: "payment",
                        title: "Payment Processed",
                        description: `₦${payment.amount} via ${payment.paymentMethod}`,
                        timestamp: payment.created_at || payment.$createdAt,
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
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center gap-6">
                <Link href="/doctor/dashboard">
                    <button className="p-3 hover:bg-white/10 rounded-2xl glass-card transition-all group">
                        <ArrowLeft className="h-6 w-6 group-hover:-translate-x-1 transition-transform" />
                    </button>
                </Link>
                <div>
                    <h1 className="text-4xl font-black tracking-tight">Patient Timeline</h1>
                    <p className="text-muted-foreground font-medium text-lg">{patient.name}</p>
                </div>
            </div>

            {/* Patient Summary */}
            <div className="glass-card p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-1">
                    <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Name</p>
                    <p className="text-xl font-bold">{patient.name}</p>
                </div>
                <div className="space-y-1">
                    <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Contact</p>
                    <p className="text-xl font-bold">{patient.phone}</p>
                </div>
                <div className="space-y-1">
                    <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Current Status</p>
                    <div className="pt-1">
                        <span className="px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest bg-primary/20 text-primary border border-primary/20">
                            {patient.status}
                        </span>
                    </div>
                </div>
            </div>

            {/* Timeline */}
            <div className="glass-card p-10">
                <h2 className="text-2xl font-bold mb-12">Medical History & Timeline</h2>
                {timeline.length === 0 ? (
                    <EmptyState title="No events" description="No medical events recorded yet" />
                ) : (
                    <div className="relative space-y-12">
                        {/* Vertical Line */}
                        <div className="absolute left-6 top-2 bottom-2 w-px bg-gradient-to-b from-primary/50 via-border to-transparent" />

                        {timeline.map((event, index) => (
                            <div key={event.id} className="relative flex gap-10 items-start group">
                                {/* Timeline marker */}
                                <div className={`relative z-10 p-3.5 rounded-2xl glass-card ring-4 ring-background transition-all group-hover:scale-110 ${getStatusColor(event.status)}`}>
                                    {event.icon}
                                </div>

                                {/* Event details */}
                                <div className="flex-1">
                                    <div className="glass-card p-6 border-white/5 hover:border-primary/30 transition-all hover:bg-white/5">
                                        <div className="flex items-start justify-between mb-2">
                                            <div>
                                                <h3 className="text-lg font-bold">{event.title}</h3>
                                                <p className="text-muted-foreground font-medium mt-1 leading-relaxed">
                                                    {event.description}
                                                </p>
                                            </div>
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusBgColor(event.status)} ${getStatusColor(event.status)} border-current/20`}>
                                                {event.status}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 mt-4 text-xs font-bold text-muted-foreground/60 uppercase tracking-widest">
                                            <Calendar className="h-3 w-3" />
                                            {new Date(event.timestamp).toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
