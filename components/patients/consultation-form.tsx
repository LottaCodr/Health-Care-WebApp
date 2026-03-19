import React, { useState } from 'react';
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Staff } from '@/actions/staff/types';
import { useCreateConsultation } from '@/hooks/use-emr';
import { useAuth } from '@/context/auth-provider';
import { toast } from 'sonner';
import {
    Stethoscope, HeartPulse, ClipboardList, Pill,
    UserRound, ArrowRight, Loader2, CheckCircle2, ChevronRight,
} from "lucide-react";

// ─── Props ────────────────────────────────────────────────────────────────────

interface ConsultationFormProps {
    patientId: string;          // ← collected from props only
    availableStaff: Staff[];
    onSuccess?: () => void;     // optional callback after successful submit
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PATIENT_STATUSES = [
    { value: 'registered',           label: 'Registered'            },
    { value: 'awaitingConsultation', label: 'Awaiting Consultation' },
    { value: 'underConsultation',    label: 'Under Consultation'    },
    { value: 'sentToNurse',          label: 'Sent to Nurse'         },
    { value: 'sentToLab',            label: 'Sent to Lab'           },
    { value: 'sentToPharmacy',       label: 'Sent to Pharmacy'      },
    { value: 'awaitingPayment',      label: 'Awaiting Payment'      },
    { value: 'admitted',             label: 'Admitted'              },
    { value: 'underObservation',     label: 'Under Observation'     },
    { value: 'discharged',           label: 'Discharged'            },
    { value: 'noStatus',             label: 'No Status'             },
];

const SECTIONS = [
    { id: 'symptoms',        label: 'Symptoms',        icon: HeartPulse    },
    { id: 'diagnosis',       label: 'Diagnosis',       icon: ClipboardList },
    { id: 'prescriptions',   label: 'Prescriptions',   icon: Pill          },
    { id: 'recommendations', label: 'Recommendations', icon: UserRound     },
    { id: 'routing',         label: 'Routing',         icon: ArrowRight    },
];

const INITIAL_FORM = {
    symptoms:        '',
    diagnosis:       '',
    prescriptions:   '',
    recommendations: '',
    referredTo:      '',
    status:          '',
    selectedStaffId: '',
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function ConsultationForm({ patientId, availableStaff, onSuccess }: ConsultationFormProps) {
    const { user } = useAuth();
    const { mutate: createConsultation, loading } = useCreateConsultation();

    const [form, setForm]             = useState(INITIAL_FORM);
    const [activeSection, setActive]  = useState('symptoms');

    // Setter helper — avoids repeating setForm spread for every field
    const set = (key: keyof typeof INITIAL_FORM) => (val: string) =>
        setForm((prev) => ({ ...prev, [key]: val }));

    // Sidebar filled indicators
    const filled: Record<string, boolean> = {
        symptoms:        !!form.symptoms.trim(),
        diagnosis:       !!form.diagnosis.trim(),
        prescriptions:   !!form.prescriptions.trim(),
        recommendations: !!form.recommendations.trim(),
        routing:         !!form.status || !!form.referredTo,
    };

    // ── Submit handler ────────────────────────────────────────────────────────

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!form.symptoms.trim()) {
            toast.error("Please enter the patient's symptoms.");
            return;
        }
        if (!form.diagnosis.trim()) {
            toast.error('Please enter a diagnosis.');
            return;
        }
        if (!patientId) {
            toast.error('No patient ID found. Cannot submit.');
            return;
        }

        try {
            await createConsultation({
                patientId,
                doctorId:        user?.$id ?? '',
                symptoms:        form.symptoms,
                diagnosis:       form.diagnosis,
                prescriptions:   form.prescriptions   || undefined,
                recommendations: form.recommendations || undefined,
                referredTo:      form.referredTo      || undefined,
                assignedStaffId: form.selectedStaffId || undefined,
                status:          form.status          || 'underConsultation',
            });

            toast.success('Consultation submitted successfully.');
            setForm(INITIAL_FORM);
            onSuccess?.();
        } catch (err: any) {
            console.error(err);
            toast.error(err?.message ?? 'Failed to submit. Please try again.');
        }
    };

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="min-h-screen bg-gray-50/60">
            <div className="max-w-6xl mx-auto px-4 py-10">

                {/* ── Page header ── */}
                <div className="mb-8 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-red-700 flex items-center justify-center shadow-lg shadow-red-200">
                        <Stethoscope size={22} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Doctor's Consultation</h1>
                        <p className="text-sm text-gray-500 mt-0.5">Record clinical findings and route the patient</p>
                    </div>
                </div>

                <div className="flex gap-6 items-start">

                    {/* ── Sidebar nav ── */}
                    <aside className="hidden lg:flex flex-col w-52 shrink-0 sticky top-8 gap-1">
                        {SECTIONS.map((section, i) => {
                            const Icon     = section.icon;
                            const isActive = activeSection === section.id;
                            const isFilled = filled[section.id];

                            return (
                                <button
                                    key={section.id}
                                    type="button"
                                    onClick={() => {
                                        setActive(section.id);
                                        document.getElementById(section.id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                    }}
                                    className={`group flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-150
                                        ${isActive
                                            ? 'bg-red-700 text-white shadow-md shadow-red-200'
                                            : 'text-gray-500 hover:bg-white hover:text-gray-800 hover:shadow-sm'
                                        }`}
                                >
                                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold
                                        ${isActive
                                            ? 'bg-white/20 text-white'
                                            : 'bg-gray-100 text-gray-400 group-hover:bg-red-50 group-hover:text-red-600'
                                        }`}>
                                        {isFilled && !isActive
                                            ? <CheckCircle2 size={14} className="text-green-500" />
                                            : <span>{i + 1}</span>
                                        }
                                    </div>
                                    <span className="text-sm font-semibold">{section.label}</span>
                                    {isActive && <ChevronRight size={14} className="ml-auto opacity-70" />}
                                </button>
                            );
                        })}
                    </aside>

                    {/* ── Form ── */}
                    <form className="flex-1 space-y-5" onSubmit={handleSubmit} autoComplete="off">

                        <FieldCard id="symptoms" step={1} icon={<HeartPulse size={18} className="text-red-600" />} label="Symptoms" helper="Describe the patient's presenting complaints in detail." onFocus={() => setActive('symptoms')}>
                            <Textarea
                                placeholder="e.g. Patient presents with persistent headache, fever of 38.5°C, fatigue for 3 days..."
                                value={form.symptoms}
                                onChange={(e) => set('symptoms')(e.target.value)}
                                className="min-h-[120px] text-sm text-gray-800 border-0 bg-transparent resize-none focus-visible:ring-0 placeholder:text-gray-300 p-0"
                            />
                        </FieldCard>

                        <FieldCard id="diagnosis" step={2} icon={<ClipboardList size={18} className="text-red-600" />} label="Diagnosis" helper="Enter your primary and differential diagnoses." onFocus={() => setActive('diagnosis')}>
                            <Textarea
                                placeholder="e.g. Provisional diagnosis: Viral fever. Rule out: Malaria, Typhoid..."
                                value={form.diagnosis}
                                onChange={(e) => set('diagnosis')(e.target.value)}
                                className="min-h-[120px] text-sm text-gray-800 border-0 bg-transparent resize-none focus-visible:ring-0 placeholder:text-gray-300 p-0"
                            />
                        </FieldCard>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <FieldCard id="prescriptions" step={3} icon={<Pill size={18} className="text-red-600" />} label="Prescriptions" helper="List all medications with dosage and frequency." onFocus={() => setActive('prescriptions')}>
                                <Textarea
                                    placeholder="e.g. Paracetamol 500mg — 8 hourly × 5 days..."
                                    value={form.prescriptions}
                                    onChange={(e) => set('prescriptions')(e.target.value)}
                                    className="min-h-[140px] text-sm text-gray-800 border-0 bg-transparent resize-none focus-visible:ring-0 placeholder:text-gray-300 p-0"
                                />
                            </FieldCard>

                            <FieldCard id="recommendations" step={4} icon={<UserRound size={18} className="text-red-600" />} label="Recommendations" helper="Add follow-up instructions or lifestyle advice." onFocus={() => setActive('recommendations')}>
                                <Textarea
                                    placeholder="e.g. Rest for 3 days, drink plenty of fluids, return if symptoms worsen..."
                                    value={form.recommendations}
                                    onChange={(e) => set('recommendations')(e.target.value)}
                                    className="min-h-[140px] text-sm text-gray-800 border-0 bg-transparent resize-none focus-visible:ring-0 placeholder:text-gray-300 p-0"
                                />
                            </FieldCard>
                        </div>

                        {/* Routing */}
                        <div id="routing" onFocus={() => setActive('routing')} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="flex items-center gap-3 px-6 pt-5 pb-4 border-b border-gray-50">
                                <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center">
                                    <ArrowRight size={16} className="text-red-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-gray-800">Patient Routing</p>
                                    <p className="text-xs text-gray-400 mt-0.5">Set the patient's next destination</p>
                                </div>
                                <span className="ml-auto text-xs font-bold text-gray-300 tracking-widest">05</span>
                            </div>

                            <div className="px-6 py-5 grid grid-cols-1 md:grid-cols-3 gap-5">
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase tracking-widest text-gray-400">Patient Status</Label>
                                    <Select onValueChange={set('status')} value={form.status}>
                                        <SelectTrigger className="h-10 text-sm bg-gray-50 border-gray-200 rounded-xl focus:ring-2 focus:ring-red-300 focus:border-red-400">
                                            <SelectValue placeholder="Select status" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-white z-30 shadow-xl rounded-xl border-gray-100">
                                            {PATIENT_STATUSES.map((s) => (
                                                <SelectItem key={s.value} value={s.value} className="text-sm">{s.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase tracking-widest text-gray-400">Refer To</Label>
                                    <Select
                                        onValueChange={(val) => { set('referredTo')(val); set('selectedStaffId')(''); }}
                                        value={form.referredTo}
                                    >
                                        <SelectTrigger className="h-10 text-sm bg-gray-50 border-gray-200 rounded-xl focus:ring-2 focus:ring-red-300 focus:border-red-400">
                                            <SelectValue placeholder="Select department" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-white z-30 shadow-xl rounded-xl border-gray-100">
                                            <SelectItem value="nurse">Nurse</SelectItem>
                                            <SelectItem value="lab-tech">Lab Technician</SelectItem>
                                            <SelectItem value="pharmacist">Pharmacist</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase tracking-widest text-gray-400">
                                        {form.referredTo
                                            ? `Assign ${form.referredTo.charAt(0).toUpperCase() + form.referredTo.slice(1)}`
                                            : 'Assign Staff'}
                                    </Label>
                                    {form.referredTo ? (
                                        availableStaff.length > 0 ? (
                                            <Select onValueChange={set('selectedStaffId')} value={form.selectedStaffId || undefined}>
                                                <SelectTrigger className="h-10 text-sm bg-gray-50 border-gray-200 rounded-xl focus:ring-2 focus:ring-red-300 focus:border-red-400">
                                                    <SelectValue placeholder={`Select ${form.referredTo}`} />
                                                </SelectTrigger>
                                                <SelectContent className="bg-white z-30 shadow-xl rounded-xl border-gray-100 max-h-60 overflow-y-auto">
                                                    {availableStaff.map((staff) => (
                                                        <SelectItem key={staff.$id} value={staff.$id} className="text-sm">{staff.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        ) : (
                                            <div className="h-10 flex items-center px-3 text-xs text-gray-400 italic bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                                No {form.referredTo} available
                                            </div>
                                        )
                                    ) : (
                                        <div className="h-10 flex items-center px-3 text-xs text-gray-400 italic bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                            Select a referral type first
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Submit */}
                        <div className="pt-2 pb-6">
                            <Button
                                type="submit"
                                disabled={loading}
                                className="w-full h-14 bg-red-700 hover:bg-red-800 text-white font-bold text-base rounded-2xl shadow-lg shadow-red-200 transition-all duration-150 tracking-wide"
                            >
                                {loading ? (
                                    <span className="flex items-center gap-2">
                                        <Loader2 size={18} className="animate-spin" />
                                        Submitting Consultation...
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-2">
                                        Submit Consultation
                                        <ArrowRight size={18} />
                                    </span>
                                )}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

// ─── Field card ───────────────────────────────────────────────────────────────

function FieldCard({
    id, step, icon, label, helper, children, onFocus,
}: {
    id: string;
    step: number;
    icon: React.ReactNode;
    label: string;
    helper?: string;
    children: React.ReactNode;
    onFocus?: () => void;
}) {
    return (
        <div
            id={id}
            onFocus={onFocus}
            className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-red-100 transition-all duration-150 overflow-hidden"
        >
            <div className="flex items-center gap-3 px-6 pt-5 pb-3 border-b border-gray-50">
                <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center shrink-0 group-focus-within:bg-red-100 transition-colors">
                    {icon}
                </div>
                <div>
                    <p className="text-sm font-bold text-gray-800">{label}</p>
                    {helper && <p className="text-xs text-gray-400 mt-0.5">{helper}</p>}
                </div>
                <span className="ml-auto text-xs font-bold text-gray-200 tracking-widest">0{step}</span>
            </div>
            <div className="px-6 py-4">{children}</div>
            <div className="h-0.5 w-0 group-focus-within:w-full bg-red-600 transition-all duration-300 ease-out" />
        </div>
    );
}