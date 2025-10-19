'use client';

import React, { useState, useRef, useEffect } from 'react';
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
    Info,
    HelpCircle,
} from 'lucide-react';
import { updateNursingAction } from '@/actions/nursing-action/get.nurse.task';
import { usePatientMutations } from '@/actions/front-desk/mutation';
import { PatientAction, PatientStatus } from '@/context/patients/types';
import { Dispatch } from 'react';

const VITALS_HELP = {
    bloodPressure: {
        label: 'Blood Pressure',
        range: '90/60 – 140/90 mmHg',
        tip: 'Enter as systolic/diastolic (e.g. 120/80 mmHg).',
    },
    temperature: {
        label: 'Temperature',
        range: '36°C – 38°C',
        tip: 'Enter in Celsius (e.g. 36.6°C).',
    },
    pulse: {
        label: 'Pulse',
        range: '60 – 100 bpm',
        tip: 'Enter as beats per minute (e.g. 72 bpm).',
    },
    respiratoryRate: {
        label: 'Respiratory Rate',
        range: '12 – 20 breaths/min',
        tip: 'Enter as breaths per minute (e.g. 16).',
    },
};

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

    const [showHelp, setShowHelp] = useState<{ [k: string]: boolean }>({});
    const firstInvalidRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

    // Validation
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

    // Focus first invalid field on submit
    useEffect(() => {
        if (firstInvalidRef.current) {
            firstInvalidRef.current.focus();
        }
    }, [touched]);

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
            // Focus first invalid field
            setTimeout(() => {
                if (firstInvalidRef.current) {
                    firstInvalidRef.current.focus();
                }
            }, 0);
            return;
        }
        mutate();
    };

    // Use red as the primary color for focus, border, and accents
    const inputErrorClass = (valid: boolean, touched: boolean) =>
        !valid && touched
            ? 'border-red-500 focus:ring-red-500'
            : 'border-gray-300 focus:ring-red-400';

    // Helper for animated underline on focus
    const inputBaseClass =
        'w-full rounded-lg px-4 py-2 bg-white border transition focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-red-400';

    // For accessibility, assign refs to first invalid field
    const getFieldRef = (valid: boolean, touched: boolean, name: string) => {
        return !valid && touched
            ? (el: HTMLInputElement | HTMLTextAreaElement | null) => {
                if (!firstInvalidRef.current && el) {
                    firstInvalidRef.current = el;
                }
            }
            : undefined;
    };

    // Reset firstInvalidRef before each render
    firstInvalidRef.current = null;

    return (
        <form
            onSubmit={handleSubmit}
            className="max-w-2xl mx-auto bg-white rounded-3xl shadow-2xl border border-red-100 px-6 md:px-10 py-8 md:py-12 space-y-10 relative"
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
            <fieldset className="grid grid-cols-1 md:grid-cols-2 gap-8" aria-labelledby="vitals-section">
                <legend id="vitals-section" className="sr-only">Vitals</legend>
                {[
                    {
                        label: 'Blood Pressure',
                        name: 'bloodPressure',
                        icon: <Activity className="w-5 h-5 text-red-500" />,
                        value: vitals.bloodPressure,
                        valid: isBloodPressureValid,
                        placeholder: 'e.g. 120/80 mmHg',
                        help: VITALS_HELP.bloodPressure,
                        type: 'text',
                    },
                    {
                        label: 'Temperature',
                        name: 'temperature',
                        icon: <Thermometer className="w-5 h-5 text-red-400" />,
                        value: vitals.temperature,
                        valid: isTemperatureValid,
                        placeholder: 'e.g. 36.6°C',
                        help: VITALS_HELP.temperature,
                        type: 'text',
                    },
                    {
                        label: 'Pulse',
                        name: 'pulse',
                        icon: <HeartPulse className="w-5 h-5 text-red-600" />,
                        value: vitals.pulse,
                        valid: isPulseValid,
                        placeholder: 'e.g. 72 bpm',
                        help: VITALS_HELP.pulse,
                        type: 'text',
                    },
                    {
                        label: 'Respiratory Rate',
                        name: 'respiratoryRate',
                        icon: <Syringe className="w-5 h-5 text-red-300" />,
                        value: vitals.respiratoryRate,
                        valid: isRespiratoryRateValid,
                        placeholder: 'e.g. 16 breaths/min',
                        help: VITALS_HELP.respiratoryRate,
                        type: 'text',
                    },
                ].map(({ label, name, icon, value, valid, placeholder, help, type }) => (
                    <div className="flex flex-col gap-2 relative group" key={name}>
                        <label
                            htmlFor={name}
                            className="flex items-center gap-2 text-base font-medium text-red-700"
                        >
                            <span className="bg-red-50 rounded-full p-1">{icon}</span>
                            {label}
                            <button
                                type="button"
                                tabIndex={-1}
                                aria-label={`Show help for ${label}`}
                                className="ml-1 text-red-400 hover:text-red-600 focus:outline-none"
                                onClick={() =>
                                    setShowHelp((prev) => ({
                                        ...prev,
                                        [name]: !prev[name],
                                    }))
                                }
                            >
                                <HelpCircle className="w-4 h-4" />
                            </button>
                        </label>
                        <input
                            id={name}
                            name={name}
                            type={type}
                            value={value}
                            onChange={(e) => setVitals({ ...vitals, [name]: e.target.value })}
                            onBlur={() => setTouched((t) => ({ ...t, [name]: true }))}
                            className={`${inputBaseClass} ${inputErrorClass(valid, touched[name as keyof typeof touched])} placeholder:text-red-300 text-lg`}
                            placeholder={placeholder}
                            required
                            autoComplete="off"
                            aria-invalid={!valid && touched[name as keyof typeof touched]}
                            aria-describedby={`${name}-error ${name}-help`}
                            ref={getFieldRef(valid, touched[name as keyof typeof touched], name)}
                        />
                        <div className="flex items-center min-h-[1.5rem]">
                            {!valid && touched[name as keyof typeof touched] && (
                                <span
                                    id={`${name}-error`}
                                    className="text-xs text-red-600 mt-1 animate-fade-in"
                                    role="alert"
                                >
                                    {label} is required.
                                </span>
                            )}
                        </div>
                        {/* Help popover */}
                        {showHelp[name] && (
                            <div
                                id={`${name}-help`}
                                className="absolute z-20 left-0 top-full mt-1 w-[95%] bg-white border border-red-200 rounded-lg shadow-lg p-3 text-xs text-gray-700 animate-fade-in"
                                role="note"
                            >
                                <div className="flex items-center gap-2 mb-1 text-red-600 font-semibold">
                                    <Info className="w-4 h-4" />
                                    {help.label}
                                </div>
                                <div>
                                    <span className="font-medium">Normal Range:</span> {help.range}
                                </div>
                                <div className="mt-1 text-gray-500">{help.tip}</div>
                                <button
                                    type="button"
                                    className="absolute top-1 right-2 text-gray-400 hover:text-red-500 text-xs"
                                    aria-label="Close help"
                                    onClick={() =>
                                        setShowHelp((prev) => ({
                                            ...prev,
                                            [name]: false,
                                        }))
                                    }
                                >
                                    ×
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </fieldset>

            {/* Treatment Given */}
            <div className="flex flex-col gap-2 relative">
                <label
                    htmlFor="treatmentGiven"
                    className="flex items-center gap-2 text-base font-medium text-red-700"
                >
                    <span className="bg-red-50 rounded-full p-1">
                        <CheckCircle2 className="w-5 h-5 text-red-500" />
                    </span>
                    Treatment Given
                    <button
                        type="button"
                        tabIndex={-1}
                        aria-label="Show help for Treatment Given"
                        className="ml-1 text-red-400 hover:text-red-600 focus:outline-none"
                        onClick={() =>
                            setShowHelp((prev) => ({
                                ...prev,
                                treatmentGiven: !prev.treatmentGiven,
                            }))
                        }
                    >
                        <HelpCircle className="w-4 h-4" />
                    </button>
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
                    aria-describedby="treatmentGiven-error treatmentGiven-help"
                    ref={getFieldRef(isTreatmentValid, touched.treatmentGiven, 'treatmentGiven')}
                />
                <div className="flex items-center min-h-[1.5rem]">
                    {!isTreatmentValid && touched.treatmentGiven && (
                        <span
                            id="treatmentGiven-error"
                            className="text-xs text-red-600 mt-1 animate-fade-in"
                            role="alert"
                        >
                            Treatment description is required.
                        </span>
                    )}
                </div>
                {showHelp.treatmentGiven && (
                    <div
                        id="treatmentGiven-help"
                        className="absolute z-20 left-0 top-full mt-1 w-[95%] bg-white border border-red-200 rounded-lg shadow-lg p-3 text-xs text-gray-700 animate-fade-in"
                        role="note"
                    >
                        <div className="flex items-center gap-2 mb-1 text-red-600 font-semibold">
                            <Info className="w-4 h-4" />
                            Treatment Given
                        </div>
                        <div>
                            <span className="font-medium">Tip:</span> Briefly describe the treatment or care provided to the patient.
                        </div>
                        <button
                            type="button"
                            className="absolute top-1 right-2 text-gray-400 hover:text-red-500 text-xs"
                            aria-label="Close help"
                            onClick={() =>
                                setShowHelp((prev) => ({
                                    ...prev,
                                    treatmentGiven: false,
                                }))
                            }
                        >
                            ×
                        </button>
                    </div>
                )}
            </div>

            {/* Submit Button */}
            <div className="pt-2">
                <Button
                    type="submit"
                    className="w-full rounded-full bg-gradient-to-r from-red-500 to-red-700 hover:from-red-600 hover:to-red-800 text-white font-semibold text-lg py-3 shadow-lg transition-colors flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
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
                {!isFormValid && (
                    <div className="mt-3 text-xs text-red-500 text-center animate-fade-in">
                        Please fill in all required fields above.
                    </div>
                )}
            </div>
        </form>
    );
}
