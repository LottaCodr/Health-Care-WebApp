"use client";

import { useEffect, useState } from "react";
import { databases } from "@/lib/appwrite.config";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from "@/components/ui/select";

const databaseId = process.env.NEXT_PUBLIC_DATABASE_ID!;

type Props = {
    patient: any; // Replace with strict Patient type if available
};

export default function PatientDetailsComponent({ patient }: Props) {
    const [notes, setNotes] = useState("");
    const [loading, setLoading] = useState(false);
    const [recipientRole, setRecipientRole] = useState("");
    const [assignedRecipient, setAssignedRecipient] = useState<string | null>(null);
    const [status, setStatus] = useState(patient?.status || "");

    useEffect(() => {
        if (!recipientRole) return;

        const roleMap: Record<string, string> = {
            nurse: "Nurse Jane Doe",
            pharmacist: "Pharmacist Tolu Adebayo",
            labtech: "Lab Technician Mark Felix",
        };

        setAssignedRecipient(roleMap[recipientRole.toLowerCase()] ?? null);
    }, [recipientRole]);

    const handleSubmit = async () => {
        if (!recipientRole || !status || !notes.trim()) {
            toast.error("Please complete all fields before submitting.");
            return;
        }

        try {
            setLoading(true);

            await databases.createDocument(databaseId, "doctor_notes", "unique()", {
                patientId: patient?.$id,
                note: notes,
                createdAt: new Date().toISOString(),
                recipientRole,
                statusUpdate: status,
            });

            await databases.updateDocument(databaseId, "patients", patient?.$id, {
                status,
            });

            setNotes("");
            setRecipientRole("");
            setAssignedRecipient(null);
            toast.success("Note and status successfully saved.");
        } catch (err) {
            console.error(err);
            toast.error("Failed to save note.");
        } finally {
            setLoading(false);
        }
    };

    if (!patient) {
        return (
            <p className="text-center pt-20 text-muted-foreground text-lg">
                Patient not found
            </p>
        );
    }

    return (
        <main className="max-w-5xl mx-6 px-6 py-12 space-y-12">
            <Card className="shadow-xl rounded-3xl border border-border bg-background">
                <CardHeader className="pb-3 border-b">
                    <CardTitle className="text-3xl font-bold text-primary">
                        Patient Profile
                    </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-5 text-base text-muted-foreground mt-4">
                    <InfoItem label="Name" value={patient.name} />
                    <InfoItem label="Gender" value={patient.gender} />
                    <InfoItem label="Email" value={patient.email || "Not provided"} />
                    <InfoItem label="Phone" value={patient.phone || "Not provided"} />
                    <InfoItem label="Occupation" value={patient.occupation || "Not provided"} />
                    <InfoItem label="Address" value={patient.address || "Not provided"} />
                    <InfoItem label="Last Visit" value={patient.lastVisit || "N/A"} />
                    <InfoItem label="Insurance Provider" value={patient.insuranceProvider || "N/A"} />
                    <InfoItem label="Current Status" value={status || "N/A"} />
                </CardContent>
            </Card>

            <Card className="shadow-lg rounded-3xl border border-border bg-background">
                <CardHeader className="pb-3 border-b">
                    <CardTitle className="text-2xl font-semibold text-primary">
                        Add Doctor&#39;s Note
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 mt-4">
                    <div className="space-y-2">
                        <Label htmlFor="recipientRole">Send To</Label>
                        <Select onValueChange={setRecipientRole} value={recipientRole}>
                            <SelectTrigger id="recipientRole" className="w-full md:w-1/2">
                                <SelectValue placeholder="Select recipient role" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="nurse">Nurse</SelectItem>
                                <SelectItem value="pharmacist">Pharmacist</SelectItem>
                                <SelectItem value="labtech">Lab Technician</SelectItem>
                            </SelectContent>
                        </Select>
                        {assignedRecipient && (
                            <p className="text-sm text-muted-foreground">
                                👤 <span className="font-medium text-foreground">{assignedRecipient}</span> will receive this note.
                            </p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="status">Patient Status</Label>
                        <Select onValueChange={setStatus} value={status}>
                            <SelectTrigger id="status" className="w-full md:w-1/2">
                                <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="admitted">Admitted</SelectItem>
                                <SelectItem value="under observation">Under Observation</SelectItem>
                                <SelectItem value="discharged">Discharged</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="notes" className="text-muted-foreground font-medium">
                            Write your findings, diagnosis, or prescriptions
                        </Label>
                        <Textarea
                            id="notes"
                            placeholder="Write your findings, diagnosis, or prescriptions..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="min-h-[160px] text-sm"
                        />
                    </div>

                    <Button
                        onClick={handleSubmit}
                        disabled={loading || !notes.trim()}
                        className="w-full md:w-auto text-white text-base px-8 py-2 rounded-xl shadow-md"
                    >
                        {loading ? "Saving..." : "Submit Note"}
                    </Button>
                </CardContent>
            </Card>
        </main>
    );
}

function InfoItem({ label, value }: { label: string; value: string }) {
    return (
        <p className="leading-relaxed">
            <span className="font-semibold text-foreground">{label}:</span>{" "}
            <span className="ml-1 text-muted-foreground">{value}</span>
        </p>
    );
}
