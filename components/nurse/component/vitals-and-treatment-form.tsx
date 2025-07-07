'use client';

import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { toast } from '@/hooks/use-toast';
import { databases } from '@/lib/appwrite.config';
import {
    Thermometer,
    HeartPulse,
    Activity,
    Stethoscope,
    Syringe,
    CheckCircle2,
} from 'lucide-react';

interface VitalsTreatmentFormProps {
    documentId: string;
    onSuccess?: () => void;
}

export default function VitalsTreatmentForm({ documentId, onSuccess }: VitalsTreatmentFormProps) {
    const [vitals, setVitals] = useState({
        bloodPressure: '',
        temperature: '',
        pulse: '',
        respiratoryRate: '',
    });

    const [treatmentGiven, setTreatmentGiven] = useState('');
    const [touched, setTouched] = useState({
        bloodPressure: false,
        temperature: false,
        pulse: false,
        respiratoryRate: false,
        treatmentGiven: false,
    });

    // Validation logic for accessibility and feedback
    const isBloodPressureValid = !!vitals.bloodPressure.trim();
    const isTemperatureValid = !!vitals.temperature.trim();
    const isPulseValid = !!vitals.pulse.trim();
    const isRespiratoryRateValid = !!vitals.respiratoryRate.trim();
    const isTreatmentValid = !!treatmentGiven.trim();

    const isFormValid =
        isBloodPressureValid &&
        isTemperatureValid &&
        isPulseValid &&
        isRespiratoryRateValid &&
        isTreatmentValid;

    const { mutate, isPending } = useMutation({
        mutationFn: async () => {
            return await databases.updateDocument(
                process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
                process.env.NEXT_PUBLIC_NURSING_ACTIONS_COLLECTION_ID!,
                documentId,
                {
                    vitals,
                    treatmentGiven,
                }
            );
        },
        onSuccess: () => {
            toast({
                title: 'Success',
                description: 'Vitals and treatment recorded successfully.',
                variant: 'success',
            });
            if (onSuccess) onSuccess();
        },
        onError: () => {
            toast({
                title: 'Error',
                description: 'Failed to update nursing action. Please try again.',
                variant: 'destructive',
            });
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!isFormValid) {
            // Mark all as touched to show errors
            setTouched({
                bloodPressure: true,
                temperature: true,
                pulse: true,
                respiratoryRate: true,
                treatmentGiven: true,
            });
            return;
        }
        mutate();
    };

    // Helper for input error state
    const inputErrorClass = (valid: boolean, touched: boolean) =>
        !valid && touched
            ? 'border-red-500 focus:ring-red-500'
            : 'border-gray-300 focus:ring-blue-500';

    return (
        <form
            onSubmit={handleSubmit}
            className="max-w-xl mx-auto bg-white rounded-2xl shadow-lg border border-gray-100 px-6 py-8 space-y-8"
            style={{
                fontFamily: 'Roboto, Arial, sans-serif',
                background: 'linear-gradient(90deg, #f8fafc 0%, #f1f3f4 100%)',
            }}
            aria-label="Record Vitals and Treatment Form"
        >
            <div className="flex items-center gap-3 mb-6">
                <Stethoscope className="w-8 h-8 text-blue-600" aria-hidden="true" />
                <h2 className="text-2xl font-semibold text-gray-900 tracking-tight">
                    Record Vitals &amp; Treatment
                </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-1">
                    <label
                        htmlFor="bloodPressure"
                        className="flex items-center gap-2 text-sm font-medium text-gray-700"
                    >
                        <Activity className="w-5 h-5 text-blue-500" aria-hidden="true" />
                        Blood Pressure
                    </label>
                    <input
                        id="bloodPressure"
                        name="bloodPressure"
                        type="text"
                        value={vitals.bloodPressure}
                        onChange={(e) => setVitals({ ...vitals, bloodPressure: e.target.value })}
                        onBlur={() => setTouched((t) => ({ ...t, bloodPressure: true }))}
                        className={`w-full rounded-lg px-4 py-2 bg-white border transition focus:outline-none ${inputErrorClass(isBloodPressureValid, touched.bloodPressure)}`}
                        placeholder="e.g. 120/80 mmHg"
                        required
                        autoComplete="off"
                        aria-invalid={!isBloodPressureValid && touched.bloodPressure}
                        aria-describedby="bloodPressure-error"
                    />
                    {!isBloodPressureValid && touched.bloodPressure && (
                        <span id="bloodPressure-error" className="text-xs text-red-600 mt-1">
                            Blood pressure is required.
                        </span>
                    )}
                </div>
                <div className="flex flex-col gap-1">
                    <label
                        htmlFor="temperature"
                        className="flex items-center gap-2 text-sm font-medium text-gray-700"
                    >
                        <Thermometer className="w-5 h-5 text-orange-500" aria-hidden="true" />
                        Temperature
                    </label>
                    <input
                        id="temperature"
                        name="temperature"
                        type="text"
                        value={vitals.temperature}
                        onChange={(e) => setVitals({ ...vitals, temperature: e.target.value })}
                        onBlur={() => setTouched((t) => ({ ...t, temperature: true }))}
                        className={`w-full rounded-lg px-4 py-2 bg-white border transition focus:outline-none ${inputErrorClass(isTemperatureValid, touched.temperature)}`}
                        placeholder="e.g. 36.6°C"
                        required
                        autoComplete="off"
                        aria-invalid={!isTemperatureValid && touched.temperature}
                        aria-describedby="temperature-error"
                    />
                    {!isTemperatureValid && touched.temperature && (
                        <span id="temperature-error" className="text-xs text-red-600 mt-1">
                            Temperature is required.
                        </span>
                    )}
                </div>
                <div className="flex flex-col gap-1">
                    <label
                        htmlFor="pulse"
                        className="flex items-center gap-2 text-sm font-medium text-gray-700"
                    >
                        <HeartPulse className="w-5 h-5 text-red-500" aria-hidden="true" />
                        Pulse
                    </label>
                    <input
                        id="pulse"
                        name="pulse"
                        type="text"
                        value={vitals.pulse}
                        onChange={(e) => setVitals({ ...vitals, pulse: e.target.value })}
                        onBlur={() => setTouched((t) => ({ ...t, pulse: true }))}
                        className={`w-full rounded-lg px-4 py-2 bg-white border transition focus:outline-none ${inputErrorClass(isPulseValid, touched.pulse)}`}
                        placeholder="e.g. 72 bpm"
                        required
                        autoComplete="off"
                        aria-invalid={!isPulseValid && touched.pulse}
                        aria-describedby="pulse-error"
                    />
                    {!isPulseValid && touched.pulse && (
                        <span id="pulse-error" className="text-xs text-red-600 mt-1">
                            Pulse is required.
                        </span>
                    )}
                </div>
                <div className="flex flex-col gap-1">
                    <label
                        htmlFor="respiratoryRate"
                        className="flex items-center gap-2 text-sm font-medium text-gray-700"
                    >
                        <Syringe className="w-5 h-5 text-green-500" aria-hidden="true" />
                        Respiratory Rate
                    </label>
                    <input
                        id="respiratoryRate"
                        name="respiratoryRate"
                        type="text"
                        value={vitals.respiratoryRate}
                        onChange={(e) => setVitals({ ...vitals, respiratoryRate: e.target.value })}
                        onBlur={() => setTouched((t) => ({ ...t, respiratoryRate: true }))}
                        className={`w-full rounded-lg px-4 py-2 bg-white border transition focus:outline-none ${inputErrorClass(isRespiratoryRateValid, touched.respiratoryRate)}`}
                        placeholder="e.g. 16 breaths/min"
                        required
                        autoComplete="off"
                        aria-invalid={!isRespiratoryRateValid && touched.respiratoryRate}
                        aria-describedby="respiratoryRate-error"
                    />
                    {!isRespiratoryRateValid && touched.respiratoryRate && (
                        <span id="respiratoryRate-error" className="text-xs text-red-600 mt-1">
                            Respiratory rate is required.
                        </span>
                    )}
                </div>
            </div>

            <div className="flex flex-col gap-1">
                <label
                    htmlFor="treatmentGiven"
                    className="flex items-center gap-2 text-sm font-medium text-gray-700"
                >
                    <CheckCircle2 className="w-5 h-5 text-teal-500" aria-hidden="true" />
                    Treatment Given
                </label>
                <textarea
                    id="treatmentGiven"
                    name="treatmentGiven"
                    value={treatmentGiven}
                    onChange={(e) => setTreatmentGiven(e.target.value)}
                    onBlur={() => setTouched((t) => ({ ...t, treatmentGiven: true }))}
                    className={`w-full rounded-lg px-4 py-2 bg-white border transition focus:outline-none resize-none ${inputErrorClass(isTreatmentValid, touched.treatmentGiven)}`}
                    rows={4}
                    placeholder="Describe treatment provided..."
                    required
                    aria-invalid={!isTreatmentValid && touched.treatmentGiven}
                    aria-describedby="treatmentGiven-error"
                />
                {!isTreatmentValid && touched.treatmentGiven && (
                    <span id="treatmentGiven-error" className="text-xs text-red-600 mt-1">
                        Treatment description is required.
                    </span>
                )}
            </div>

            <Button
                type="submit"
                className="w-full rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-lg py-3 shadow transition-colors flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-60"
                disabled={isPending || !isFormValid}
                aria-disabled={isPending || !isFormValid}
                aria-busy={isPending}
            >
                {isPending ? (
                    <>
                        <Spinner size="sm" />
                        <span>Submitting...</span>
                    </>
                ) : (
                    <>
                        <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
                        <span>Submit</span>
                    </>
                )}
            </Button>
        </form>
    );
}
