import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { FaStethoscope, FaHeartbeat, FaNotesMedical, FaPills, FaUserMd } from "react-icons/fa";
import { Staff } from '@/actions/staff/types';

interface ConsultationFormProps {
    symptoms: string;
    diagnosis: string;
    prescriptions: string;
    recommendations: string;
    referredTo: string;
    status: string;
    selectedStaffId?: string;
    availableStaff: Staff[];
    onSymptomsChange: (val: string) => void;
    onDiagnosisChange: (val: string) => void;
    onPrescriptionsChange: (val: string) => void;
    onRecommendationsChange: (val: string) => void;
    onReferredToChange: (val: string) => void;
    onStatusChange: (val: string) => void;
    onStaffSelect: (val: string) => void;
    onSubmit: () => void;
    loading: boolean;
}

export default function ConsultationForm({
    symptoms,
    diagnosis,
    prescriptions,
    recommendations,
    referredTo,
    status,
    selectedStaffId,
    availableStaff,
    onSymptomsChange,
    onDiagnosisChange,
    onPrescriptionsChange,
    onRecommendationsChange,
    onReferredToChange,
    onStatusChange,
    onStaffSelect,
    onSubmit,
    loading
}: ConsultationFormProps) {

    const patientStatuses = [
        { value: 'registered', label: 'Registered' },
        { value: 'awaitingConsultation', label: 'Awaiting Consultation' },
        { value: 'underConsultation', label: 'Under Consultation' },
        { value: 'sentToNurse', label: 'Sent to Nurse' },
        { value: 'sentToLab', label: 'Sent to Lab' },
        { value: 'sentToPharmacy', label: 'Sent to Pharmacy' },
        { value: 'awaitingPayment', label: 'Awaiting Payment' },
        { value: 'admitted', label: 'Admitted' },
        { value: 'underObservation', label: 'Under Observation' },
        { value: 'discharged', label: 'Discharged' },
        { value: 'noStatus', label: 'No Status' },
    ];

    // UI improvement: Use a grid for form layout, add section dividers, subtle backgrounds, and helper texts
    // Primary color is red
    return (
        <section aria-labelledby="doctor-consultation">
            <Card className="shadow-2xl rounded-3xl border bg-gradient-to-br from-white via-red-50 to-red-100 dark:from-background dark:to-muted/40">
                <CardHeader className="pb-6 border-b flex flex-col gap-2">
                    <CardTitle id="doctor-consultation" className="text-3xl font-bold text-red-900 flex items-center gap-3">
                        <FaStethoscope className="text-red-700 text-2xl" /> Doctor's Consultation
                    </CardTitle>
                    <span className="text-gray-500 text-base font-normal">
                        Fill out the details below to record your consultation.
                    </span>
                </CardHeader>
                <CardContent className="mt-6">
                    <form
                        className="grid grid-cols-1 md:grid-cols-2 gap-8"
                        onSubmit={e => {
                            e.preventDefault();
                            onSubmit();
                        }}
                        autoComplete="off"
                    >
                        <div className="space-y-6">
                            <FormSection
                                label="Symptoms"
                                value={symptoms}
                                onChange={onSymptomsChange}
                                icon={<FaHeartbeat className="text-red-600" />}
                                helper="Describe the patient's symptoms in detail."
                                primaryColor="red"
                            />
                            <FormSection
                                label="Diagnosis"
                                value={diagnosis}
                                onChange={onDiagnosisChange}
                                icon={<FaNotesMedical className="text-red-500" />}
                                helper="Enter your clinical diagnosis."
                                primaryColor="red"
                            />
                        </div>
                        <div className="space-y-6">
                            <FormSection
                                label="Prescriptions"
                                value={prescriptions}
                                onChange={onPrescriptionsChange}
                                icon={<FaPills className="text-red-400" />}
                                helper="List all prescribed medications."
                                primaryColor="red"
                            />
                            <FormSection
                                label="Recommendations"
                                value={recommendations}
                                onChange={onRecommendationsChange}
                                icon={<FaUserMd className="text-red-700" />}
                                helper="Add any additional recommendations or instructions."
                                primaryColor="red"
                            />
                        </div>

                        <div className="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                            {/* Patient Status Field */}
                            <div className="space-y-2">
                                <Label htmlFor="status" className="text-lg font-semibold text-gray-700 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> Patient Status
                                </Label>
                                <Select onValueChange={onStatusChange} value={status}>
                                    <SelectTrigger id="status" className="bg-white/80 dark:bg-muted/60 border border-red-200 focus:ring-2 focus:ring-red-400">
                                        <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white z-30 shadow-lg rounded-xl">
                                        {patientStatuses.map((status) => (
                                            <SelectItem key={status.value} value={status.value}>
                                                {status.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <span className="text-xs text-gray-400">Update the patient's current status.</span>
                            </div>

                            {/* Referred To Field */}
                            <div className="space-y-2">
                                <Label htmlFor="referredTo" className="text-lg font-semibold text-gray-700 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> Refer To
                                </Label>
                                <Select onValueChange={onReferredToChange} value={referredTo}>
                                    <SelectTrigger id="referredTo" className="bg-white/80 dark:bg-muted/60 border border-red-200 focus:ring-2 focus:ring-red-400">
                                        <SelectValue placeholder="Select referral" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white z-30 shadow-lg rounded-xl">
                                        <SelectItem value="nurse">Nurse</SelectItem>
                                        <SelectItem value="labtech">Lab Technician</SelectItem>
                                        <SelectItem value="pharmacist">Pharmacist</SelectItem>
                                    </SelectContent>
                                </Select>
                                <span className="text-xs text-gray-400">Choose a department or staff to refer the patient to.</span>
                            </div>

                            {/* Staff Selection Field */}
                            <div className="space-y-2">
                                <Label htmlFor="staffSelection" className="text-lg font-semibold text-gray-700 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
                                    {referredTo
                                        ? `Assign ${referredTo.charAt(0).toUpperCase() + referredTo.slice(1)}`
                                        : "Assign Staff"}
                                </Label>
                                {referredTo ? (
                                    availableStaff.length > 0 ? (
                                        <Select onValueChange={onStaffSelect} value={selectedStaffId || undefined}>
                                            <SelectTrigger id="staffSelection" className="bg-white/80 dark:bg-muted/60 border border-red-200 focus:ring-2 focus:ring-red-400">
                                                <SelectValue placeholder={`Select ${referredTo}`} />
                                            </SelectTrigger>
                                            <SelectContent className="bg-white z-30 shadow-lg rounded-xl max-h-60 overflow-y-auto">
                                                {availableStaff.map((staff) => (
                                                    <SelectItem key={staff.$id} value={staff.$id}>
                                                        {staff.full_name || staff.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <div className="text-gray-400 text-sm italic py-2 px-3 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                                            No {referredTo} available
                                        </div>
                                    )
                                ) : (
                                    <div className="text-gray-400 text-sm italic py-2 px-3 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                                        Select a referral type first
                                    </div>
                                )}
                                <span className="text-xs text-gray-400">Assign a specific staff member for follow-up.</span>
                            </div>
                        </div>

                        <div className="col-span-1 md:col-span-2 flex justify-end mt-8">
                            <Button
                                type="submit"
                                onClick={onSubmit}
                                disabled={loading}
                                className="w-full md:w-auto text-white text-base px-10 py-3 rounded-2xl shadow-lg bg-gradient-to-r from-red-700 to-red-500 hover:from-red-800 hover:to-red-600 transition font-semibold tracking-wide"
                            >
                                {loading ? (
                                    <span className="flex items-center gap-2">
                                        <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                                        </svg>
                                        Submitting...
                                    </span>
                                ) : (
                                    "Submit Consultation"
                                )}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </section>
    );
}

// Improved FormSection with helper text, focus, and subtle background
function FormSection({
    label,
    value,
    onChange,
    icon,
    helper,
    primaryColor,
}: {
    label: string;
    value: string;
    onChange: (val: string) => void;
    icon: JSX.Element;
    helper?: string;
    primaryColor?: "red";
}) {
    // Use red as the primary color for focus and border
    const borderColor = primaryColor === "red" ? "border-red-200 focus:ring-2 focus:ring-red-400" : "border-blue-200 focus:ring-2 focus:ring-blue-400";
    const bgColor = primaryColor === "red" ? "bg-white/80 dark:bg-muted/60" : "bg-white/80 dark:bg-muted/60";
    return (
        <div className="space-y-2">
            <Label htmlFor={label.toLowerCase()} className="text-lg font-semibold text-gray-700 flex items-center gap-2">
                {icon} {label}
            </Label>
            <Textarea
                id={label.toLowerCase()}
                placeholder={`Enter ${label.toLowerCase()}...`}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className={`min-h-[120px] text-base ${borderColor} rounded-xl ${bgColor} shadow-sm transition`}
            />
            {helper && (
                <span className="text-xs text-gray-400">{helper}</span>
            )}
        </div>
    );
}
