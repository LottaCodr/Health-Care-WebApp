"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/context/auth-provider";
import { useCreatePrescription } from "@/hooks/use-emr";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Plus, Trash2, Pill } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const defaultPatient = {
    name: "John Doe",
    dob: "1980-05-14",
    sex: "Male",
    mrn: "1000100954",
};

const defaultDoctor = {
    name: "Dr. Sarah Munson",
    specialty: "Internal Medicine",
    npi: "1234567890",
    address: "1234 Main St, NYC, NY",
};

function statusColor(status: string) {
    switch (status) {
        case "Active":
            return "bg-green-100 text-green-700";
        case "Completed":
            return "bg-blue-100 text-blue-700";
        case "Expired":
            return "bg-red-100 text-red-700";
        default:
            return "bg-gray-100 text-gray-700";
    }
}

interface MedicationInput {
    drugName: string;
    strength: string;
    dosage: string;
    route: string;
    duration: string;
    instructions: string;
    status: string;
}

export default function PrescriptionDetails() {
    const [patientInfo] = useState(defaultPatient);
    const [doctorInfo] = useState(defaultDoctor);

    const [medications, setMedications] = useState<MedicationInput[]>([
        {
            drugName: "",
            strength: "",
            dosage: "",
            route: "",
            duration: "",
            instructions: "",
            status: "Active",
        },
    ]);
    const [checkedMedications, setCheckedMedications] = useState<Set<number>>(new Set());
    const [notes, setNotes] = useState("");
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);
    const { user } = useAuth();
    const { mutate: createPrescription, loading: creating } = useCreatePrescription();
    const { toast } = useToast();
    const router = useRouter();

    const handleMedicationChange = (
        index: number,
        field: keyof MedicationInput,
        value: any
    ) => {
        setMedications((prev) => {
            const updated = [...prev];
            updated[index] = {
                ...updated[index],
                [field]: value,
            };
            return updated;
        });

        // Error clearing inline
        const errorKey = `med_${index}_${field}`;
        if (errors[errorKey]) {
            setErrors((prev) => {
                const newErrors = { ...prev };
                delete newErrors[errorKey];
                return newErrors;
            });
        }
    };

    const addMedication = () => {
        setMedications((prev) => [
            ...prev,
            {
                drugName: "",
                strength: "",
                dosage: "",
                route: "",
                duration: "",
                instructions: "",
                status: "Active",
            },
        ]);
    };

    const removeMedication = (index: number) => {
        setMedications((prev) => prev.filter((_, i) => i !== index));
        setCheckedMedications((prev) => {
            const updated = new Set(prev);
            updated.delete(index);
            return updated;
        });
    };

    const toggleMedicationCheck = (index: number) => {
        setCheckedMedications((prev) => {
            const updated = new Set(prev);
            if (updated.has(index)) {
                updated.delete(index);
            } else {
                updated.add(index);
            }
            return updated;
        });
    };

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (medications.length === 0) {
            newErrors.medications = "At least one medication must be listed";
        }

        medications.forEach((med, idx) => {
            if (!med.drugName.trim()) {
                newErrors[`med_${idx}_drugName`] = "Medication name is required";
            }
            if (!med.dosage.trim()) {
                newErrors[`med_${idx}_dosage`] = "Dosage is required";
            }
        });

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleCreatePrescription = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!validateForm()) {
            toast.error("Please fill in all required fields");
            return;
        }
        setSubmitting(true);
        try {
            // Replace with API call
            await createPrescription({
                patient: patientInfo,
                doctor: doctorInfo,
                // medications: medications,
                notes: notes,
                createdBy: user?.id ?? ""
            });
            setSubmitting(false);
            // toast("Prescription created successfully!");
            router.back();
        } catch (error) {
            setSubmitting(false);
            // toast("Failed to create prescription. Please try again.");
        }
    };

    return (
        <Card className="bg-white text-black max-w-4xl mx-auto shadow-lg">
            <CardHeader>
                <CardTitle>
                    Create a new prescription
                </CardTitle>
                <CardDescription>
                    Fill in the details below to prescribe new medications for this patient.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleCreatePrescription} className="space-y-6">
                    {/* Medication Entry */}
                    <div className="mb-8">
                        <div className="flex items-center justify-between">
                            <Label className="text-base font-semibold">
                                Prescription Medications
                            </Label>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={addMedication}
                                disabled={submitting || creating}
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Medication
                            </Button>
                        </div>
                        {errors.medications && (
                            <p className="text-sm text-destructive">{errors.medications}</p>
                        )}
                        <div className="space-y-4">
                            {medications.map((med, idx) => (
                                <div key={idx} className="border rounded-md p-4 bg-gray-50 relative space-y-3">
                                    {/* Checkbox and Header */}
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start gap-3">
                                            <Checkbox
                                                id={`med_check_${idx}`}
                                                checked={checkedMedications.has(idx)}
                                                onCheckedChange={() => toggleMedicationCheck(idx)}
                                                disabled={submitting || creating}
                                                className="mt-1"
                                            />
                                            <Label htmlFor={`med_check_${idx}`} className="font-semibold cursor-pointer">
                                                Medication {idx + 1}
                                            </Label>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removeMedication(idx)}
                                            disabled={(submitting || creating) || medications.length === 1}
                                        >
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </div>
                                    {/* Main medication grid */}
                                    <div className="grid md:grid-cols-3 gap-4 mb-2">
                                        <div className="space-y-1">
                                            <Label htmlFor={`drugName_${idx}`}>
                                                Medication Name <span className="text-destructive">*</span>
                                            </Label>
                                            <Input
                                                id={`drugName_${idx}`}
                                                value={med.drugName}
                                                placeholder="e.g. Paracetamol"
                                                onChange={e =>
                                                    handleMedicationChange(idx, "drugName", e.target.value)
                                                }
                                                disabled={submitting || creating}
                                                className={errors[`med_${idx}_drugName`] ? "border-destructive" : ""}
                                            />
                                            {errors[`med_${idx}_drugName`] && (
                                                <p className="text-sm text-destructive">{errors[`med_${idx}_drugName`]}</p>
                                            )}
                                        </div>
                                        <div>
                                            <Label htmlFor={`strength_${idx}`}>Strength</Label>
                                            <Input
                                                id={`strength_${idx}`}
                                                value={med.strength}
                                                placeholder="e.g. 500mg"
                                                onChange={e => handleMedicationChange(idx, "strength", e.target.value)}
                                                disabled={submitting || creating}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label htmlFor={`dosage_${idx}`}>
                                                Dosage <span className="text-destructive">*</span>
                                            </Label>
                                            <Input
                                                id={`dosage_${idx}`}
                                                value={med.dosage}
                                                placeholder="e.g. 1 tablet every 8 hours"
                                                onChange={e =>
                                                    handleMedicationChange(idx, "dosage", e.target.value)
                                                }
                                                disabled={submitting || creating}
                                                className={errors[`med_${idx}_dosage`] ? "border-destructive" : ""}
                                            />
                                            {errors[`med_${idx}_dosage`] && (
                                                <p className="text-sm text-destructive">{errors[`med_${idx}_dosage`]}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="grid md:grid-cols-3 gap-4 mb-2">
                                        <div>
                                            <Label htmlFor={`route_${idx}`}>Route</Label>
                                            <Input
                                                id={`route_${idx}`}
                                                value={med.route}
                                                placeholder="e.g. Oral"
                                                onChange={e => handleMedicationChange(idx, "route", e.target.value)}
                                                disabled={submitting || creating}
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor={`duration_${idx}`}>Duration</Label>
                                            <Input
                                                id={`duration_${idx}`}
                                                value={med.duration}
                                                placeholder="e.g. 5 days"
                                                onChange={e => handleMedicationChange(idx, "duration", e.target.value)}
                                                disabled={submitting || creating}
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor={`instructions_${idx}`}>Instructions</Label>
                                            <Input
                                                id={`instructions_${idx}`}
                                                value={med.instructions}
                                                placeholder="e.g. After meals"
                                                onChange={e => handleMedicationChange(idx, "instructions", e.target.value)}
                                                disabled={submitting || creating}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 mt-2">
                                        <Label htmlFor={`status_${idx}`}>Status</Label>
                                        <select
                                            id={`status_${idx}`}
                                            className="border rounded px-2 py-1"
                                            value={med.status}
                                            onChange={e => handleMedicationChange(idx, "status", e.target.value)}
                                            disabled={submitting || creating}
                                        >
                                            <option value="Active">Active</option>
                                            <option value="Completed">Completed</option>
                                            <option value="Expired">Expired</option>
                                        </select>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    {/* Notes */}
                    <div className="mb-4">
                        <Label className="font-semibold mb-1 block">Additional Notes</Label>
                        <Textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            rows={3}
                            placeholder="Enter any relevant notes or instructions for this prescription..."
                            disabled={submitting || creating}
                        />
                    </div>
                    <div className="flex justify-end">
                        <Button
                            type="submit"
                            disabled={submitting || creating || medications.length === 0}
                            className="w-full md:w-auto text-white"
                        >
                            {(submitting || creating) ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <Pill className="h-4 w-4 mr-2" />
                                    Create Prescription
                                </>
                            )}
                        </Button>
                    </div>
                    {/* Info Box */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
                        <p className="text-sm text-blue-900">
                            <strong>Note:</strong> Ensure all medication details are accurate before submission. The prescription will be associated with the selected patient and doctor.
                        </p>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
