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
                    Record Vitals & Treatment
                </h2>
            </div>

            {/* Vitals Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                    {
                        label: 'Blood Pressure',
                        name: 'bloodPressure',
                        icon: <Activity className="w-5 h-5 text-blue-500" />,
                        value: vitals.bloodPressure,
                        valid: isBloodPressureValid,
                    },
                    {
                        label: 'Temperature',
                        name: 'temperature',
                        icon: <Thermometer className="w-5 h-5 text-orange-500" />,
                        value: vitals.temperature,
                        valid: isTemperatureValid,
                    },
                    {
                        label: 'Pulse',
                        name: 'pulse',
                        icon: <HeartPulse className="w-5 h-5 text-red-500" />,
                        value: vitals.pulse,
                        valid: isPulseValid,
                    },
                    {
                        label: 'Respiratory Rate',
                        name: 'respiratoryRate',
                        icon: <Syringe className="w-5 h-5 text-green-500" />,
                        value: vitals.respiratoryRate,
                        valid: isRespiratoryRateValid,
                    },
                ].map(({ label, name, icon, value, valid }) => (
                    <div className="flex flex-col gap-1" key={name}>
                        <label
                            htmlFor={name}
                            className="flex items-center gap-2 text-sm font-medium text-gray-700"
                        >
                            {icon}
                            {label}
                        </label>
                        <input
                            id={name}
                            name={name}
                            type="text"
                            value={value}
                            onChange={(e) => setVitals({ ...vitals, [name]: e.target.value })}
                            onBlur={() => setTouched((t) => ({ ...t, [name]: true }))}
                            className={`w-full rounded-lg px-4 py-2 bg-white border transition focus:outline-none ${inputErrorClass(valid, touched[name as keyof typeof touched])}`}
                            placeholder={`Enter ${label.toLowerCase()}`}
                            required
                            autoComplete="off"
                            aria-invalid={!valid && touched[name as keyof typeof touched]}
                            aria-describedby={`${name}-error`}
                        />
                        {!valid && touched[name as keyof typeof touched] && (
                            <span id={`${name}-error`} className="text-xs text-red-600 mt-1">
                                {label} is required.
                            </span>
                        )}
                    </div>
                ))}
            </div>

            {/* Treatment Given */}
            <div className="flex flex-col gap-1">
                <label
                    htmlFor="treatmentGiven"
                    className="flex items-center gap-2 text-sm font-medium text-gray-700"
                >
                    <CheckCircle2 className="w-5 h-5 text-teal-500" />
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

            {/* Submit Button */}
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
                        <CheckCircle2 className="w-5 h-5" />
                        <span>Submit</span>
                    </>
                )}
            </Button>
        </form>
    );
}
