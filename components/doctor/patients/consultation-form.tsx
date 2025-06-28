import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { FaStethoscope, FaHeartbeat, FaNotesMedical, FaPills, FaUserMd } from "react-icons/fa";
import { Staff } from '@/actions/staff/types';

// interface Staff {
//     $id: string;
//     name: string;
//     role: string;
// }

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

    return (
        <section aria-labelledby="doctor-consultation">
            <Card className="shadow-lg rounded-2xl border bg-white dark:bg-background">
                <CardHeader className="pb-4 border-b">
                    <CardTitle id="doctor-consultation" className="text-2xl font-semibold text-blue-900 flex items-center gap-2">
                        <FaStethoscope className="text-blue-700" /> Doctor's Consultation
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-8 mt-4">
                    <FormSection label="Symptoms" value={symptoms} onChange={onSymptomsChange} icon={<FaHeartbeat className="text-red-600" />} />
                    <FormSection label="Diagnosis" value={diagnosis} onChange={onDiagnosisChange} icon={<FaNotesMedical className="text-green-600" />} />
                    <FormSection label="Prescriptions" value={prescriptions} onChange={onPrescriptionsChange} icon={<FaPills className="text-purple-600" />} />
                    <FormSection label="Recommendations" value={recommendations} onChange={onRecommendationsChange} icon={<FaUserMd className="text-blue-600" />} />

                    {/* Patient Status Field */}
                    <div className="space-y-2">
                        <Label htmlFor="status" className="text-lg font-medium text-gray-700">Patient Status</Label>
                        <Select onValueChange={onStatusChange} value={status}>
                            <SelectTrigger id="status">
                                <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent className="bg-white z-20">
                                {patientStatuses.map((status) => (
                                    <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Referred To Field */}
                    <div className="space-y-2">
                        <Label htmlFor="referredTo" className="text-lg font-medium text-gray-700">Refer To</Label>
                        <Select onValueChange={onReferredToChange} value={referredTo}>
                            <SelectTrigger id="referredTo">
                                <SelectValue placeholder="Select referral" />
                            </SelectTrigger>
                            <SelectContent className="bg-white z-20">
                                <SelectItem value="nurse">Nurse</SelectItem>
                                <SelectItem value="labtech">Lab Technician</SelectItem>
                                <SelectItem value="pharmacist">Pharmacist</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Staff Selection Field */}
                    {referredTo && (
                        <div className="space-y-2">
                            <Label htmlFor="staffSelection" className="text-lg font-medium text-gray-700">
                                Assign {referredTo.charAt(0).toUpperCase() + referredTo.slice(1)}
                            </Label>
                            {availableStaff.length > 0 ? (
                                <Select onValueChange={onStaffSelect} value={selectedStaffId || undefined}>
                                    <SelectTrigger id="staffSelection">
                                        <SelectValue placeholder={`Select ${referredTo}`} />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white z-20">
                                        {availableStaff.map((staff) => (
                                            <SelectItem key={staff.$id} value={staff.$id}>
                                                {staff.full_name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <div className="text-gray-500 text-sm">No {referredTo} available</div>
                            )}
                        </div>
                    )}

                    <Button
                        onClick={onSubmit}
                        disabled={loading}
                        className="w-full md:w-auto text-white text-base px-8 py-3 rounded-xl shadow bg-blue-700 hover:bg-blue-800 transition"
                    >
                        {loading ? "Submitting..." : "Submit Consultation"}
                    </Button>
                </CardContent>
            </Card>
        </section>
    );
}

function FormSection({
    label,
    value,
    onChange,
    icon,
}: {
    label: string;
    value: string;
    onChange: (val: string) => void;
    icon: JSX.Element;
}) {
    return (
        <div className="space-y-2">
            <Label htmlFor={label.toLowerCase()} className="text-lg font-medium text-gray-700 flex items-center gap-2">
                {icon} {label}
            </Label>
            <Textarea
                id={label.toLowerCase()}
                placeholder={`Enter ${label.toLowerCase()}...`}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="min-h-[150px] text-base border-border rounded-xl"
            />
        </div>
    );
}
