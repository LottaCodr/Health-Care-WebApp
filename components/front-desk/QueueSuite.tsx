"use client";

import React, { useState } from "react";
import { useRoleProtection } from "@/lib/role-utils";
import { UserRole, PatientStatus } from "@/types/models";
import { usePatientsByStatus, useUpdatePatientStatus } from "@/hooks/emr/use-patients";
import { LoadingSkeleton, EmptyState, SuccessAlert } from "@/components/emr";
import { Loader2, HeartPulse } from "lucide-react";
import { toast } from "sonner";
import { fmtFull } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function QueueSuite() {
    const { authorized } = useRoleProtection([UserRole.FrontDesk, UserRole.Admin]);

    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [movingId, setMovingId] = useState<string | null>(null);

    const registeredPatients = usePatientsByStatus(PatientStatus.Registered);
    const sentToNursePatients = usePatientsByStatus(PatientStatus.SentToNurse);
    const awaitingConsultationPatients = usePatientsByStatus(PatientStatus.AwaitingConsultation);
    const updatePatientStatusMutation = useUpdatePatientStatus();

    if (!authorized) return null;

    const handleMoveToQueue = async (patientId: string, name: string) => {
        setMovingId(patientId);
        try {
            // mutateAsync (not mutate) so failures surface here instead of
            // silently showing a success banner for a move that never happened.
            await updatePatientStatusMutation.mutateAsync({ id: patientId, status: PatientStatus.AwaitingConsultation });
            setSuccessMessage(`${name} moved to consultation queue.`);
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (error) {
            console.error(error);
            toast.error(`Could not move ${name} to the queue. Please try again.`);
        } finally {
            setMovingId(null);
        }
    };

    const arrivalsLoading = registeredPatients.isLoading || sentToNursePatients.isLoading;
    const withNurse = sentToNursePatients.data ?? [];
    const unprocessed = registeredPatients.data ?? [];

    return (
        <div className="space-y-8">
            {successMessage && <SuccessAlert message={successMessage} />}

            <Card className="rounded-3xl border-gray-100 bg-white p-6 shadow-sm">
                <div className="mb-6 flex items-center justify-between">
                    <h3 className="text-xl font-bold text-gray-800">Arrivals Lounge</h3>
                    {(unprocessed.length > 0 || withNurse.length > 0) && (
                        <Badge variant="secondary" className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-500">
                            {unprocessed.length + withNurse.length} arrival{unprocessed.length + withNurse.length !== 1 ? "s" : ""}
                        </Badge>
                    )}
                </div>

                {arrivalsLoading && <LoadingSkeleton rows={3} />}

                <div className="space-y-4">
                    {/* Unprocessed arrivals — front desk can move straight to doctor queue */}
                    {unprocessed.map(p => (
                        <div key={p.id} className="flex justify-between items-center gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-gray-900 truncate">{p.name}</p>
                                <p className="text-sm text-gray-500">Arrived: {fmtFull(p.created_at ?? "")}</p>
                            </div>
                            <Button
                                onClick={() => handleMoveToQueue(p.id, p.name)}
                                disabled={movingId === p.id}
                                className="min-w-[140px] gap-2 rounded-xl bg-blue-600 px-6 py-2 font-semibold text-white shadow-md shadow-blue-100 hover:bg-blue-700">
                                {movingId === p.id && <Loader2 size={14} className="animate-spin" />}
                                {movingId === p.id ? "Moving…" : "Move to Queue"}
                            </Button>
                        </div>
                    ))}

                    {/* New registrations are routed to the nurse for vitals first */}
                    {withNurse.map(p => (
                        <div key={p.id} className="flex justify-between items-center gap-3 p-4 bg-teal-50/50 rounded-2xl border border-teal-100">
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-gray-900 truncate">{p.name}</p>
                                <p className="text-xs text-gray-500">Arrived: {fmtFull(p.created_at ?? "")}</p>
                            </div>
                            <Badge variant="outline" className="shrink-0 gap-1.5 rounded-full border-teal-100 bg-white px-3 py-1.5 text-xs font-bold text-teal-700 shadow-sm">
                                <HeartPulse size={12} /> With nurse — vitals
                            </Badge>
                        </div>
                    ))}

                    {!arrivalsLoading && unprocessed.length === 0 && withNurse.length === 0 && (
                        <EmptyState title="Lounge Empty" description="No new arrivals awaiting triage" icon="✓" />
                    )}
                </div>
            </Card>

            <Card className="rounded-3xl border-gray-100 bg-white p-6 shadow-sm">
                <h3 className="mb-6 text-xl font-bold text-gray-800">Doctor&apos;s Queue</h3>
                {awaitingConsultationPatients.isLoading && <LoadingSkeleton rows={2} />}
                <div className="space-y-3">
                    {awaitingConsultationPatients.data?.map((p, i) => (
                        <div key={p.id} className="flex items-center p-4 bg-blue-50 rounded-2xl border border-blue-100">
                            <span className="w-10 h-10 flex items-center justify-center bg-blue-600 text-white font-bold rounded-full mr-4 shadow-lg shadow-blue-200">{i + 1}</span>
                            <div className="flex-1">
                                <p className="font-bold text-gray-900">{p.name}</p>
                                <p className="text-xs text-gray-600">{p.phone}</p>
                            </div>
                            <Badge variant="outline" className="rounded-full border-blue-100 bg-white px-3 py-1 text-sm font-semibold text-blue-700 shadow-sm">Waiting</Badge>
                        </div>
                    ))}
                    {!awaitingConsultationPatients.isLoading && awaitingConsultationPatients.data?.length === 0 && (
                        <EmptyState title="Queue Empty" description="Consultation rooms are ready" icon="🥼" />
                    )}
                </div>
            </Card>
        </div>
    );
}
