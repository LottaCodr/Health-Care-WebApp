"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/auth-provider";
import { useRoleProtection } from "@/lib/role-utils";
import { usePatient, useCreateNursingAction, useUpdateNursingAction, useUpdatePatientStatus } from "@/hooks/use-emr";
import { LoadingSkeleton, ErrorAlert, SuccessAlert, PatientInfoCard } from "@/components/emr";
import { Button } from "@/components/ui/button";
import { Activity, Thermometer, HeartPulse } from "lucide-react";

import { UserRole } from "@/types/models";

interface VitalsSuiteProps {
    patientId: string;
    taskId?: string; // If updating an existing nursing action
    onComplete?: () => void;
}

export default function VitalsSuite({ patientId, taskId, onComplete }: VitalsSuiteProps) {
    const { user } = useAuth();
    const { authorized } = useRoleProtection([UserRole.Nurse, UserRole.Admin]);
    const { data: patient, loading: patientLoading } = usePatient(patientId);

    const [form, setForm] = useState({
        bp: "",
        temp: "",
        pulse: "",
        treatment: "",
        notes: "",
    });
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState<string | null>(null);

    const createActionMutation = useCreateNursingAction();
    const updateActionMutation = useUpdateNursingAction();
    const updatePatientStatusMutation = useUpdatePatientStatus();

    if (!authorized) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const description = `BP: ${form.bp}, Temp: ${form.temp}°C, Pulse: ${form.pulse} bpm. Treatment: ${form.treatment}. Notes: ${form.notes}`;

            if (taskId) {
                await updateActionMutation.mutate(taskId, {
                    status: "Completed",
                    description,
                    completedBy: user?.$id,
                    completionTime: new Date().toISOString(),
                });
            } else {
                await createActionMutation.mutate({
                    patientId,
                    actionType: "Vitals",
                    description,
                    status: "Completed",
                    assignedNurse: user?.$id || "",
                    completedBy: user?.$id || "",
                    completionTime: new Date().toISOString(),
                });
            }

            await updatePatientStatusMutation.mutate(patientId, "AwaitingNextStep" as any);
            setSuccess("Documentation finalized successfully.");
            if (onComplete) setTimeout(onComplete, 2000);
        } catch (error) {
            console.error(error);
        } finally {
            setSubmitting(false);
        }
    };

    if (patientLoading) return <LoadingSkeleton rows={5} />;

    return (
        <div className="space-y-8">
            {success && <SuccessAlert message={success} />}
            {patient && <PatientInfoCard patient={patient} />}

            <form onSubmit={handleSubmit} className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-bold text-gray-700 uppercase tracking-wider">
                            <Activity size={16} className="text-blue-600" /> Blood Pressure
                        </label>
                        <input value={form.bp} onChange={e => setForm(p => ({ ...p, bp: e.target.value }))} placeholder="120/80" className="w-full p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all font-mono" required />
                    </div>
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-bold text-gray-700 uppercase tracking-wider">
                            <Thermometer size={16} className="text-orange-600" /> Temperature
                        </label>
                        <input value={form.temp} onChange={e => setForm(p => ({ ...p, temp: e.target.value }))} placeholder="36.5" className="w-full p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all font-mono" required />
                    </div>
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-bold text-gray-700 uppercase tracking-wider">
                            <HeartPulse size={16} className="text-red-600" /> Pulse Rate
                        </label>
                        <input value={form.pulse} onChange={e => setForm(p => ({ ...p, pulse: e.target.value }))} placeholder="72" className="w-full p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all font-mono" required />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Clinical Treatment/Nursing Care</label>
                    <textarea value={form.treatment} onChange={e => setForm(p => ({ ...p, treatment: e.target.value }))} rows={4} className="w-full p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all" placeholder="Describe clinical actions taken..." required />
                </div>

                <Button type="submit" disabled={submitting} className="w-full py-8 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-lg font-bold shadow-xl shadow-blue-100">
                    {submitting ? "Finalizing Documentation..." : "Complete & Finalize Vitals"}
                </Button>
            </form>
        </div>
    );
}
