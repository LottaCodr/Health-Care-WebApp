"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

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

export default function PrescriptionDetails() {
    const [patientInfo] = useState(defaultPatient);
    const [doctorInfo] = useState(defaultDoctor);

    const [medications, setMedications] = useState([
        {
            name: "",
            strength: "",
            dosage: "",
            route: "",
            duration: "",
            instructions: "",
            status: "Active",
        },
    ]);
    const [notes, setNotes] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const onMedChange = (i: number, field: string, value: string) => {
        setMedications((prev) =>
            prev.map((med, idx) => (idx === i ? { ...med, [field]: value } : med))
        );
    };

    const addMedication = () => {
        setMedications((meds) => [
            ...meds,
            {
                name: "",
                strength: "",
                dosage: "",
                route: "",
                duration: "",
                instructions: "",
                status: "Active",
            },
        ]);
    };

    const removeMedication = (idx: number) => {
        setMedications((meds) => meds.filter((_, i) => i !== idx));
    };

    const handleCreatePrescription = async () => {
        // Example validation (refine as needed)
        if (!medications.length || medications.some((m) => !m.name || !m.dosage)) {
            toast.error("Please fill in all required medication fields");
            return;
        }
        setSubmitting(true);
        // Simulate submit
        setTimeout(() => {
            setSubmitting(false);
            toast.success("Prescription created successfully!");
            // Reset form if needed
        }, 1200);
    };

    return (
        <Card className="bg-white text-black max-w-4xl mx-auto shadow-lg">
            <CardHeader>
                <CardTitle>

                    Create a new prescription
                </CardTitle>
                <p className="text-muted-foreground text-sm">
                    Fill in the details below to prescribe new medications for this patient.
                </p>
            </CardHeader>
            <CardContent>

                {/* Medication Entry */}
                <div className="mb-8">
                    {/* <div className="font-semibold text-lg mb-2">Create a new prescription</div> */}
                    {medications.map((med, idx) => (
                        <div key={idx} className="border rounded-md p-4 mb-4 bg-gray-50 relative">
                            <div className="grid md:grid-cols-3 gap-4 mb-2">
                                <div>
                                    <Label>Medication Name*</Label>
                                    <Input
                                        value={med.name}
                                        placeholder="e.g. Paracetamol"
                                        onChange={(e) => onMedChange(idx, "name", e.target.value)}
                                    />
                                </div>
                                <div>
                                    <Label>Strength</Label>
                                    <Input
                                        value={med.strength}
                                        placeholder="e.g. 500mg"
                                        onChange={(e) => onMedChange(idx, "strength", e.target.value)}
                                    />
                                </div>
                                <div>
                                    <Label>Dosage*</Label>
                                    <Input
                                        value={med.dosage}
                                        placeholder="e.g. 1 tablet every 8 hours"
                                        onChange={(e) => onMedChange(idx, "dosage", e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="grid md:grid-cols-3 gap-4 mb-2">
                                <div>
                                    <Label>Route</Label>
                                    <Input
                                        value={med.route}
                                        placeholder="e.g. Oral"
                                        onChange={(e) => onMedChange(idx, "route", e.target.value)}
                                    />
                                </div>
                                <div>
                                    <Label>Duration</Label>
                                    <Input
                                        value={med.duration}
                                        placeholder="e.g. 5 days"
                                        onChange={(e) => onMedChange(idx, "duration", e.target.value)}
                                    />
                                </div>
                                <div>
                                    <Label>Instructions</Label>
                                    <Input
                                        value={med.instructions}
                                        placeholder="e.g. After meals"
                                        onChange={(e) => onMedChange(idx, "instructions", e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="flex items-center gap-3 mt-2">
                                <Label>Status</Label>
                                <select
                                    className="border rounded px-2 py-1"
                                    value={med.status}
                                    onChange={(e) => onMedChange(idx, "status", e.target.value)}
                                >
                                    <option value="Active">Active</option>
                                    <option value="Completed">Completed</option>
                                    <option value="Expired">Expired</option>
                                </select>
                                {medications.length > 1 && (
                                    <Button
                                        size="sm"
                                        variant="destructive"
                                        className="ml-auto"
                                        type="button"
                                        onClick={() => removeMedication(idx)}
                                    >
                                        <Trash2 size={16} />
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))}
                    <Button
                        type="button"
                        variant="outline"
                        className="flex text-primary items-center gap-2 mb-4"
                        onClick={addMedication}
                    >
                        <Plus size={18} /> Add Medication
                    </Button>
                </div>
                {/* Notes */}
                <div className="mb-4">
                    <Label className="font-semibold mb-1 block">Additional Notes</Label>
                    <Textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3}
                        placeholder="Enter any relevant notes or instructions for this prescription..."
                    />
                </div>
                <div className="flex justify-end">
                    <Button
                        onClick={handleCreatePrescription}
                        disabled={submitting}
                        className="w-full md:w-auto text-white"
                    >
                        {submitting ? "Creating..." : "Create Prescription"}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
