"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/auth-provider";
import { useRoleProtection } from "@/lib/role-utils";
import { UserRole } from "@/types/models";
import { usePendingPrescriptions } from "@/hooks/use-emr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    LoadingSkeleton,
    EmptyState,
    ErrorAlert,
} from "@/components/emr-ui";
import Link from "next/link";
import { Pill, CheckCircle2, Clock } from "lucide-react";

interface PrescriptionSummary {
    pending: number;
    dispensed: number;
}

export default function PharmacistDashboard() {
    const { user, loading: authLoading } = useAuth();
    const { authorized, loading: roleLoading } = useRoleProtection([UserRole.Pharmacist, UserRole.Admin]);
    const { data: pendingPrescriptions, loading, error } = usePendingPrescriptions();

    const [prescriptionSummary, setPrescriptionSummary] = useState<PrescriptionSummary>({
        pending: 0,
        dispensed: 0,
    });

    const [filteredPrescriptions, setFilteredPrescriptions] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState("pending");

    useEffect(() => {
        if (pendingPrescriptions && user) {
            // Only consider prescriptions assigned to this pharmacist
            const mine = pendingPrescriptions.filter((p: any) => p.pharmacistId === user.$id);
            const pending = mine.filter((p: any) => p.status === "Active");
            const dispensed = mine.filter((p: any) => p.status === "Dispensed");

            setPrescriptionSummary({
                pending: pending.length,
                dispensed: dispensed.length,
            });

            if (activeTab === "pending") {
                setFilteredPrescriptions(pending);
            } else {
                setFilteredPrescriptions(dispensed);
            }
        }
    }, [pendingPrescriptions, activeTab, user]);

    if (authLoading || roleLoading) return <LoadingSkeleton />;

    if (!authorized) {
        return <ErrorAlert message="Unauthorized access. Pharmacists only." />;
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-gray-900">Pharmacist Dashboard</h1>
                    <p className="text-gray-600 mt-2">Manage prescription fulfillment</p>
                </div>

                {/* Statistics */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Pending Prescriptions</CardTitle>
                            <Clock className="h-4 w-4 text-yellow-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{prescriptionSummary.pending}</div>
                            <p className="text-xs text-gray-600">Awaiting dispensing</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Dispensed Today</CardTitle>
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{prescriptionSummary.dispensed}</div>
                            <p className="text-xs text-gray-600">Completed dispensing</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Prescriptions Queue */}
                <Card>
                    <CardHeader>
                        <CardTitle>Prescription Queue</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Tabs value={activeTab} onValueChange={setActiveTab}>
                            <TabsList>
                                <TabsTrigger value="pending">Pending</TabsTrigger>
                                <TabsTrigger value="dispensed">Dispensed</TabsTrigger>
                            </TabsList>

                            <TabsContent value={activeTab} className="mt-6">
                                {error && <ErrorAlert message={error.message} />}

                                {loading && <LoadingSkeleton />}

                                {!loading && !error && filteredPrescriptions.length === 0 && (
                                    <EmptyState
                                        title="No prescriptions"
                                        description={`No ${activeTab} prescriptions at the moment`}
                                    />
                                )}

                                {!loading && filteredPrescriptions.length > 0 && (
                                    <div className="space-y-4">
                                        {filteredPrescriptions.map((prescription) => (
                                            <Link
                                                key={prescription.$id}
                                                href={`/pharmacist/dispense/${prescription.$id}`}
                                            >
                                                <div className="p-4 border border-gray-200 rounded-lg hover:bg-blue-50 cursor-pointer transition">
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex-1">
                                                            <h3 className="font-semibold text-gray-900">
                                                                Patient ID: {prescription.patientId}
                                                            </h3>
                                                            <p className="text-sm text-gray-600 mt-1">
                                                                Medications: {prescription.medications?.length || 0}
                                                            </p>
                                                            <div className="mt-3 space-y-1">
                                                                {prescription.medications?.slice(0, 2).map((med: any, idx: number) => (
                                                                    <p key={idx} className="text-xs text-gray-500">
                                                                        • {med.drugName} - {med.dosage} ({med.frequency})
                                                                    </p>
                                                                ))}
                                                                {prescription.medications?.length > 2 && (
                                                                    <p className="text-xs text-gray-500">
                                                                        + {prescription.medications.length - 2} more
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <span
                                                            className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ml-4 ${prescription.status === "Active"
                                                                ? "bg-yellow-100 text-yellow-800"
                                                                : "bg-green-100 text-green-800"
                                                                }`}
                                                        >
                                                            {prescription.status}
                                                        </span>
                                                    </div>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
