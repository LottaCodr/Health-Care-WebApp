"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/auth-provider";
import { useRoleProtection } from "@/lib/role-utils";
import { usePatient, useCreateNursingAction, useUpdateNursingAction, useUpdatePatientStatus } from "@/hooks/use-emr";
import { LoadingSkeleton, SuccessAlert, PatientInfoCard } from "@/components/emr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Activity, Thermometer, HeartPulse } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { UserRole } from "@/types/models";
import { AITriageScore } from "../ai/AIComponents";
import { calculateAge } from "@/utils/export";

const FIELD_CONFIG = [
    { key: "bloodPressure", label: "Blood Pressure (mmHg)", placeholder: "120/80", leftIcon: <Activity size={16} className="text-blue-600" />, required: true, type: "text" },
    { key: "temperature", label: "Temperature (°C)", placeholder: "36.5", leftIcon: <Thermometer size={16} className="text-orange-600" />, required: true, type: "number" },
    { key: "pulse", label: "Pulse Rate (bpm)", placeholder: "72", leftIcon: <HeartPulse size={16} className="text-red-600" />, required: true, type: "number" },
    { key: "respiration", label: "Respiration Rate (breaths/min)", placeholder: "16", required: false, type: "number" },
    { key: "spo2", label: "Oxygen Saturation (SpO₂ %)", placeholder: "98", required: false, type: "number" },
    { key: "weight", label: "Weight (kg)", placeholder: "65", required: false, type: "number" },
    { key: "height", label: "Height (cm)", placeholder: "170", required: false, type: "number" },
    { key: "bmi", label: "BMI (auto-calculated)", placeholder: "", required: false, type: "number", disabled: true },
];

const INITIAL_FORM = {
    bloodPressure: "",
    temperature: "",
    pulse: "",
    respiration: "",
    spo2: "",
    weight: "",
    height: "",
    bmi: "",
    treatment: "",
    notes: "",
};

export default function VitalsCheckinAdvancedComponent(props: {
    patientId: string;
    taskId?: string;
    onComplete?: () => void;
}) {
    const { patientId, taskId, onComplete } = props;
    const router = useRouter();

    const { user } = useAuth();
    const { authorized } = useRoleProtection([UserRole.Nurse, UserRole.Admin]);

    const { data: patient, loading: patientLoading } = usePatient(patientId, {
        enabled: !!patientId,
    });

    const [form, setForm] = useState(INITIAL_FORM);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState<string | null>(null);

    const createActionMutation = useCreateNursingAction();
    const updateActionMutation = useUpdateNursingAction();
    const updatePatientStatusMutation = useUpdatePatientStatus();
    const age = calculateAge(patient?.date_of_birth!)

    // Auto-calculate BMI
    useEffect(() => {
        const weight = parseFloat(form.weight);
        const height = parseFloat(form.height);
        if (!isNaN(weight) && !isNaN(height) && height > 0) {
            const bmi = weight / (height / 100) ** 2;
            setForm((prev) => ({ ...prev, bmi: bmi.toFixed(1) }));
        } else {
            setForm((prev) => ({ ...prev, bmi: "" }));
        }
    }, [form.weight, form.height]);

    if (!authorized) return null;

    if (!patientId) {
        return (
            <div className="p-8 text-center text-red-500 font-semibold">
                No patient selected. Please provide a valid patient ID.
            </div>
        );
    }

    if (patientLoading) return <LoadingSkeleton rows={5} />;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setSubmitting(true);

        const requiredFields = ["bloodPressure", "temperature", "pulse"];
        for (const field of requiredFields) {
            if (!(form[field as keyof typeof form] ?? "").toString().trim()) {
                toast.error(`Please provide a value for ${FIELD_CONFIG.find((f) => f.key === field)?.label ?? field}.`);
                setSubmitting(false);
                return;
            }
        }

        try {
            const description = [
                `BP: ${form.bloodPressure}`,
                `Temp: ${form.temperature}°C`,
                `Pulse: ${form.pulse} bpm`,
                form.respiration ? `Resp: ${form.respiration}/min` : null,
                form.spo2 ? `SpO₂: ${form.spo2}%` : null,
                form.weight ? `Wt: ${form.weight}kg` : null,
                form.height ? `Ht: ${form.height}cm` : null,
                form.bmi ? `BMI: ${form.bmi}` : null,
                form.treatment ? `Treatment: ${form.treatment}` : null,
                form.notes ? `Notes: ${form.notes}` : null,
            ]
                .filter(Boolean)
                .join(". ");

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
                    assignedNurse: user?.$id ?? "",
                    completedBy: user?.$id ?? "",
                    completionTime: new Date().toISOString(),
                });
            }

            await updatePatientStatusMutation.mutate(patientId, "AwaitingNextStep" as any);

            setSuccess("Vitals documentation finalized successfully.");
            toast.success("Vitals recorded successfully");

            if (onComplete) {
                setTimeout(onComplete, 2000);
            } else {
                setTimeout(() => router.push("/nurse/dashboard"), 1000);
            }
        } catch (err: any) {
            console.error(err);
            toast.error("Failed to save vitals");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-8">
            {success && <SuccessAlert message={success} />}
            {patient && <PatientInfoCard patient={patient} />}

            <form
                onSubmit={handleSubmit}
                className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 space-y-8 max-w-3xl mx-auto"
            >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {FIELD_CONFIG.map((field) => (
                        <div className="space-y-2" key={field.key}>
                            <label
                                className="flex items-center gap-2 text-sm font-bold text-gray-700 uppercase tracking-wider"
                                htmlFor={field.key}
                            >
                                {field.leftIcon}
                                {field.label}
                                {field.required && <span className="text-red-500">*</span>}
                            </label>
                            <Input
                                id={field.key}
                                name={field.key}
                                type={field.type}
                                placeholder={field.placeholder}
                                value={form[field.key as keyof typeof form]}
                                onChange={handleChange}
                                disabled={!!field.disabled || submitting}
                                required={field.required}
                                inputMode={field.type === "number" ? "decimal" : undefined}
                            />
                        </div>
                    ))}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="treatment" className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                        Clinical Treatment / Nursing Care
                    </Label>
                    <Textarea
                        id="treatment"
                        name="treatment"
                        placeholder="Describe clinical actions taken..."
                        value={form.treatment}
                        onChange={handleChange}
                        rows={3}
                        disabled={submitting}
                        required
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="notes" className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                        Additional Notes
                    </Label>
                    <Textarea
                        id="notes"
                        name="notes"
                        placeholder="Write any observations here..."
                        value={form.notes}
                        onChange={handleChange}
                        rows={3}
                        disabled={submitting}
                    />
                </div>

                <Button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-8 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-lg font-bold shadow-xl shadow-blue-100"
                >
                    {submitting ? "Finalizing Documentation..." : "Complete & Finalize Vitals"}
                </Button>
            </form>

            <AITriageScore bloodPressure={form.bloodPressure} temperature={form.temperature}
    pulse={form.pulse} patientAge={age} patientGender={patient?.gender} />
        </div>
    );
}