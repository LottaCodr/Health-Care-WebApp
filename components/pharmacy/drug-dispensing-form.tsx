"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-provider";
import { usePrescription, useDispensePrescription } from "@/hooks/use-emr";
import { Prescription } from "@/types/models";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, AlertCircle, CheckCircle2, Pill, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DispensedMedicationInput {
    drugId: string;
    drugName: string;
    quantityDispensed: number;
    quantityRemaining: number;
    expiryDate: string;
    batchNumber: string;
}

interface DrugDispensingFormProps {
    prescriptionId: string;
    patientId: string;
    onSuccess?: () => void;
}

/**
 * Drug Dispensing Form
 * Allows pharmacist to dispense medications and update patient status
 * Updates patient status to AwaitingPayment when dispensing is complete
 */
export function DrugDispensingForm({
    prescriptionId,
    patientId,
    onSuccess,
}: DrugDispensingFormProps) {
    const router = useRouter();
    const { user } = useAuth();
    const { toast } = useToast();

    // Fetch prescription details
    const { data: prescription, loading: prescriptionLoading } = usePrescription(prescriptionId);
    const { mutate: dispenseprescription, loading: dispensing } = useDispensePrescription();

    const [dispensedMedications, setDispensedMedications] = useState<DispensedMedicationInput[]>([]);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [checkedMedications, setCheckedMedications] = useState<Set<number>>(new Set());

    // Initialize dispensed medications from prescription
    React.useEffect(() => {
        if (prescription && prescription.medications) {
            const initialized = prescription.medications.map((med, idx) => ({
                drugId: `drug_${idx}`,
                drugName: med.drugName,
                quantityDispensed: 0,
                quantityRemaining: 0,
                expiryDate: new Date().toISOString().split("T")[0],
                batchNumber: "",
            }));
            setDispensedMedications(initialized);
        }
    }, [prescription]);

    const handleMedicationChange = (
        index: number,
        field: keyof DispensedMedicationInput,
        value: any
    ) => {
        const updated = [...dispensedMedications];
        updated[index] = {
            ...updated[index],
            [field]: value,
        };
        setDispensedMedications(updated);

        // Clear error when user edits
        const errorKey = `med_${index}_${field}`;
        if (errors[errorKey]) {
            setErrors((prev) => {
                const newErrors = { ...prev };
                delete newErrors[errorKey];
                return newErrors;
            });
        }
    };

    const handleAddMedication = () => {
        setDispensedMedications((prev) => [
            ...prev,
            {
                drugId: `drug_${prev.length}`,
                drugName: "",
                quantityDispensed: 0,
                quantityRemaining: 0,
                expiryDate: new Date().toISOString().split("T")[0],
                batchNumber: "",
            },
        ]);
    };

    const handleRemoveMedication = (index: number) => {
        setDispensedMedications((prev) => prev.filter((_, i) => i !== index));
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

        if (dispensedMedications.length === 0) {
            newErrors.medications = "At least one medication must be dispensed";
        }

        dispensedMedications.forEach((med, idx) => {
            if (!med.drugName.trim()) {
                newErrors[`med_${idx}_drugName`] = "Drug name is required";
            }
            if (med.quantityDispensed <= 0) {
                newErrors[`med_${idx}_quantityDispensed`] = "Quantity must be greater than 0";
            }
            if (!med.expiryDate) {
                newErrors[`med_${idx}_expiryDate`] = "Expiry date is required";
            }
            if (!med.batchNumber.trim()) {
                newErrors[`med_${idx}_batchNumber`] = "Batch number is required";
            }
        });

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!validateForm()) {
            toast.error("Please fill in all required fields");
            return;
        }

        try {
            // Dispense prescription
            const result = await dispenseprescription(
                prescriptionId,
                patientId,
                user?.id || "",
                dispensedMedications
            );

            if (result) {
                toast.success("Medications dispensed and patient status updated");

                // Reset form
                setDispensedMedications([]);
                setCheckedMedications(new Set());

                // Callback or redirect
                if (onSuccess) {
                    onSuccess();
                } else {
                    setTimeout(() => router.back(), 1500);
                }
            }
        } catch (error) {
            console.error("Error dispensing medications:", error);
            toast.error("Failed to dispense medications. Please try again.");
        }
    };

    if (prescriptionLoading) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-muted-foreground">Loading prescription...</span>
                </CardContent>
            </Card>
        );
    }

    if (!prescription) {
        return (
            <Card className="border-destructive">
                <CardContent className="flex items-center gap-3 py-6">
                    <AlertCircle className="h-5 w-5 text-destructive" />
                    <div>
                        <p className="font-semibold text-destructive">Prescription not found</p>
                        <p className="text-sm text-muted-foreground">Please check the prescription ID and try again</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Drug Dispensing</CardTitle>
                <CardDescription>
                    Dispense medications for prescription {prescriptionId.substring(0, 8)}...
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Prescription Information */}
                    <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                        <h3 className="font-semibold text-slate-900">Prescription Details</h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="text-muted-foreground">Status:</span>
                                <p className="font-medium">{prescription.status}</p>
                            </div>
                            <div>
                                <span className="text-muted-foreground">Created:</span>
                                <p className="font-medium">
                                    {new Date(prescription.createdDate || prescription.$createdAt).toLocaleDateString()}
                                </p>
                            </div>
                            <div className="col-span-2">
                                <span className="text-muted-foreground">Instructions:</span>
                                <p className="font-medium">{prescription.instructions}</p>
                            </div>
                        </div>
                    </div>

                    {/* Medications to Dispense */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label className="text-base font-semibold">
                                Medications to Dispense
                            </Label>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleAddMedication}
                                disabled={dispensing}
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Medication
                            </Button>
                        </div>

                        {errors.medications && (
                            <p className="text-sm text-destructive">{errors.medications}</p>
                        )}

                        <div className="space-y-4">
                            {dispensedMedications.map((med, index) => (
                                <div key={index} className="border rounded-lg p-4 space-y-4">
                                    {/* Checkbox and Header */}
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start gap-3">
                                            <Checkbox
                                                id={`med_check_${index}`}
                                                checked={checkedMedications.has(index)}
                                                onCheckedChange={() => toggleMedicationCheck(index)}
                                                disabled={dispensing}
                                                className="mt-1"
                                            />
                                            <Label htmlFor={`med_check_${index}`} className="font-semibold cursor-pointer">
                                                Medication {index + 1}
                                            </Label>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleRemoveMedication(index)}
                                            disabled={dispensing || dispensedMedications.length === 1}
                                        >
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </div>

                                    {/* Medication Details Grid */}
                                    <div className="grid grid-cols-2 gap-4">
                                        {/* Drug Name */}
                                        <div className="col-span-2 space-y-2">
                                            <Label htmlFor={`drugName_${index}`}>
                                                Drug Name <span className="text-destructive">*</span>
                                            </Label>
                                            <Input
                                                id={`drugName_${index}`}
                                                value={med.drugName}
                                                onChange={(e) => handleMedicationChange(index, "drugName", e.target.value)}
                                                placeholder="e.g., Paracetamol"
                                                disabled={dispensing}
                                                className={errors[`med_${index}_drugName`] ? "border-destructive" : ""}
                                            />
                                            {errors[`med_${index}_drugName`] && (
                                                <p className="text-sm text-destructive">{errors[`med_${index}_drugName`]}</p>
                                            )}
                                        </div>

                                        {/* Quantity Dispensed */}
                                        <div className="space-y-2">
                                            <Label htmlFor={`quantityDispensed_${index}`}>
                                                Quantity <span className="text-destructive">*</span>
                                            </Label>
                                            <Input
                                                id={`quantityDispensed_${index}`}
                                                type="number"
                                                value={med.quantityDispensed}
                                                onChange={(e) =>
                                                    handleMedicationChange(index, "quantityDispensed", parseInt(e.target.value))
                                                }
                                                placeholder="0"
                                                min="1"
                                                disabled={dispensing}
                                                className={errors[`med_${index}_quantityDispensed`] ? "border-destructive" : ""}
                                            />
                                            {errors[`med_${index}_quantityDispensed`] && (
                                                <p className="text-sm text-destructive">
                                                    {errors[`med_${index}_quantityDispensed`]}
                                                </p>
                                            )}
                                        </div>

                                        {/* Quantity Remaining */}
                                        <div className="space-y-2">
                                            <Label htmlFor={`quantityRemaining_${index}`}>
                                                Remaining (Optional)
                                            </Label>
                                            <Input
                                                id={`quantityRemaining_${index}`}
                                                type="number"
                                                value={med.quantityRemaining}
                                                onChange={(e) =>
                                                    handleMedicationChange(
                                                        index,
                                                        "quantityRemaining",
                                                        parseInt(e.target.value)
                                                    )
                                                }
                                                placeholder="0"
                                                min="0"
                                                disabled={dispensing}
                                            />
                                        </div>

                                        {/* Expiry Date */}
                                        <div className="space-y-2">
                                            <Label htmlFor={`expiryDate_${index}`}>
                                                Expiry Date <span className="text-destructive">*</span>
                                            </Label>
                                            <Input
                                                id={`expiryDate_${index}`}
                                                type="date"
                                                value={med.expiryDate}
                                                onChange={(e) =>
                                                    handleMedicationChange(index, "expiryDate", e.target.value)
                                                }
                                                disabled={dispensing}
                                                className={errors[`med_${index}_expiryDate`] ? "border-destructive" : ""}
                                            />
                                            {errors[`med_${index}_expiryDate`] && (
                                                <p className="text-sm text-destructive">
                                                    {errors[`med_${index}_expiryDate`]}
                                                </p>
                                            )}
                                        </div>

                                        {/* Batch Number */}
                                        <div className="space-y-2">
                                            <Label htmlFor={`batchNumber_${index}`}>
                                                Batch Number <span className="text-destructive">*</span>
                                            </Label>
                                            <Input
                                                id={`batchNumber_${index}`}
                                                value={med.batchNumber}
                                                onChange={(e) => handleMedicationChange(index, "batchNumber", e.target.value)}
                                                placeholder="e.g., BATCH-2026-001"
                                                disabled={dispensing}
                                                className={errors[`med_${index}_batchNumber`] ? "border-destructive" : ""}
                                            />
                                            {errors[`med_${index}_batchNumber`] && (
                                                <p className="text-sm text-destructive">
                                                    {errors[`med_${index}_batchNumber`]}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Submit Buttons */}
                    <div className="flex gap-2">
                        <Button
                            type="submit"
                            disabled={dispensing || dispensedMedications.length === 0}
                            className="flex-1"
                        >
                            {dispensing ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <Pill className="h-4 w-4 mr-2" />
                                    Dispense Medications
                                </>
                            )}
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            disabled={dispensing}
                            onClick={() => router.back()}
                        >
                            Cancel
                        </Button>
                    </div>

                    {/* Info Box */}
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <p className="text-sm text-green-900">
                            <strong>Note:</strong> After dispensing, the patient will automatically be moved to
                            awaiting payment status. Ensure all medication details are accurate before submission.
                        </p>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
