'use client';

import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { toast } from '@/hooks/use-toast';
import {
    Thermometer,
    HeartPulse,
    Activity,
    Stethoscope,
    Syringe,
    CheckCircle2,
} from 'lucide-react';
import { updateNursingAction } from '@/actions/nursing-action/get.nurse.task';
import { usePatientMutations } from '@/actions/patients/mutation';
import { PatientAction, PatientStatus } from '@/context/patients/types';
import { Dispatch } from 'react';

interface VitalsTreatmentFormProps {
    documentId: string;
    patientId: string;
    dispatch: Dispatch<PatientAction>;
    onSuccess?: () => void;
}

export default function VitalsTreatmentForm({
    documentId,
    patientId,
    dispatch,
    onSuccess,
}: VitalsTreatmentFormProps) {
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

    const { updatePatient } = usePatientMutations(dispatch);

    const { mutate, isPending } = useMutation({
        mutationFn: async () => {
            await updateNursingAction({
                documentId,
                bloodPressure: vitals.bloodPressure,
                temperature: vitals.temperature,
                pulseRate: vitals.pulse,
                respiratoryRate: vitals.respiratoryRate,
                treatmentGiven,
            });

            await updatePatient.mutateAsync({
                id: patientId,
                updates: {
                    status: 'awaitingPayment' as PatientStatus,
                    notes: 'Vitals recorded, Treatment given & awaiting payment',
                },
            });
        },
        onSuccess: () => {
            toast({
                title: 'Success',
                description: 'Vitals and treatment recorded successfully.',
            });
            if (onSuccess) onSuccess();
        },
        onError: () => {
            toast({
                title: 'Error',
                description: 'Failed to record vitals. Please try again.',
                variant: 'destructive',
            });
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!isFormValid) {
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

    // Use red as the primary color for focus, border, and accents
    const inputErrorClass = (valid: boolean, touched: boolean) =>
        !valid && touched
            ? 'border-red-500 focus:ring-red-500'
            : 'border-gray-300 focus:ring-red-500';

    // Helper for animated underline on focus
    const inputBaseClass =
        'w-full rounded-lg px-4 py-2 bg-white border transition focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500';

    return (
        <form
            onSubmit={handleSubmit}
            className="max-w-xl mx-auto bg-white rounded-3xl shadow-2xl border border-red-100 px-8 py-10 space-y-10"
            style={{
                fontFamily: 'Roboto, Arial, sans-serif',
                background: 'linear-gradient(90deg, #fff1f2 0%, #ffe4e6 100%)',
            }}
            aria-label="Record Vitals and Treatment Form"
        >
            <div className="flex items-center gap-4 mb-8">
                <span className="bg-red-100 rounded-full p-3 shadow">
                    <Stethoscope className="w-9 h-9 text-red-600" aria-hidden="true" />
                </span>
                <h2 className="text-3xl font-bold text-red-700 tracking-tight drop-shadow">
                    Record Vitals & Treatment
                </h2>
            </div>

            {/* Vitals Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {[
                    {
                        label: 'Blood Pressure',
                        name: 'bloodPressure',
                        icon: <Activity className="w-5 h-5 text-red-500" />,
                        value: vitals.bloodPressure,
                        valid: isBloodPressureValid,
                        placeholder: 'e.g. 120/80 mmHg',
                    },
                    {
                        label: 'Temperature',
                        name: 'temperature',
                        icon: <Thermometer className="w-5 h-5 text-red-400" />,
                        value: vitals.temperature,
                        valid: isTemperatureValid,
                        placeholder: 'e.g. 36.6°C',
                    },
                    {
                        label: 'Pulse',
                        name: 'pulse',
                        icon: <HeartPulse className="w-5 h-5 text-red-600" />,
                        value: vitals.pulse,
                        valid: isPulseValid,
                        placeholder: 'e.g. 72 bpm',
                    },
                    {
                        label: 'Respiratory Rate',
                        name: 'respiratoryRate',
                        icon: <Syringe className="w-5 h-5 text-red-300" />,
                        value: vitals.respiratoryRate,
                        valid: isRespiratoryRateValid,
                        placeholder: 'e.g. 16 breaths/min',
                    },
                ].map(({ label, name, icon, value, valid, placeholder }) => (
                    <div className="flex flex-col gap-2" key={name}>
                        <label
                            htmlFor={name}
                            className="flex items-center gap-2 text-base font-medium text-red-700"
                        >
                            <span className="bg-red-50 rounded-full p-1">{icon}</span>
                            {label}
                        </label>
                        <input
                            id={name}
                            name={name}
                            type="text"
                            value={value}
                            onChange={(e) => setVitals({ ...vitals, [name]: e.target.value })}
                            onBlur={() => setTouched((t) => ({ ...t, [name]: true }))}
                            className={`${inputBaseClass} ${inputErrorClass(valid, touched[name as keyof typeof touched])} placeholder:text-red-300 text-lg`}
                            placeholder={placeholder}
                            required
                            autoComplete="off"
                            aria-invalid={!valid && touched[name as keyof typeof touched]}
                            aria-describedby={`${name}-error`}
                        />
                        <div className="h-5">
                            {!valid && touched[name as keyof typeof touched] && (
                                <span id={`${name}-error`} className="text-xs text-red-600 mt-1 animate-fade-in">
                                    {label} is required.
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Treatment Given */}
            <div className="flex flex-col gap-2">
                <label
                    htmlFor="treatmentGiven"
                    className="flex items-center gap-2 text-base font-medium text-red-700"
                >
                    <span className="bg-red-50 rounded-full p-1">
                        <CheckCircle2 className="w-5 h-5 text-red-500" />
                    </span>
                    Treatment Given
                </label>
                <textarea
                    id="treatmentGiven"
                    name="treatmentGiven"
                    value={treatmentGiven}
                    onChange={(e) => setTreatmentGiven(e.target.value)}
                    onBlur={() => setTouched((t) => ({ ...t, treatmentGiven: true }))}
                    className={`${inputBaseClass} ${inputErrorClass(isTreatmentValid, touched.treatmentGiven)} resize-none min-h-[90px] placeholder:text-red-300 text-lg`}
                    rows={4}
                    placeholder="Describe treatment provided..."
                    required
                    aria-invalid={!isTreatmentValid && touched.treatmentGiven}
                    aria-describedby="treatmentGiven-error"
                />
                <div className="h-5">
                    {!isTreatmentValid && touched.treatmentGiven && (
                        <span id="treatmentGiven-error" className="text-xs text-red-600 mt-1 animate-fade-in">
                            Treatment description is required.
                        </span>
                    )}
                </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
                <Button
                    type="submit"
                    className="w-full rounded-full bg-red-600 hover:bg-red-700 text-white font-semibold text-lg py-3 shadow-lg transition-colors flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
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
                            <CheckCircle2 className="w-5 h-5 text-white" />
                            <span>Submit</span>
                        </>
                    )}
                </Button>
            </div>
        </form>
    );
}
