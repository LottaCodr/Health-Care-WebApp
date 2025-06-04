"use client";

import { useState } from "react";
import { databases } from "@/lib/appwrite.config";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const databaseId = process.env.NEXT_PUBLIC_DATABASE_ID!;

type Props = {
    patient: any; // Replace with Patient type when available
};

export default function PatientDetailsComponent({ patient }: Props) {
    const [notes, setNotes] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        try {
            await databases.createDocument(databaseId, "doctor_notes", "unique()", {
                patientId: patient?.$id,
                note: notes,
                createdAt: new Date().toISOString(),
            });
            setNotes("");
            toast.success("Note successfully saved.");
        } catch (err) {
            console.error(err);
            toast.error("Failed to save note.");
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
        <main className="max-w-4xl mx-6 px-4 sm:px-6 py-12 space-y-10">
            {/* Patient Profile */}
            <Card className="shadow-lg rounded-2xl border border-border bg-background">
                <CardHeader className="pb-2">
                    <CardTitle className="text-2xl font-bold text-primary">
                        Patient Profile
                    </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm text-muted-foreground">
                    <InfoItem label="Name" value={patient.name} />
                    <InfoItem label="Gender" value={patient.gender} />
                    <InfoItem label="Email" value={patient.email || "Not provided"} />
                    <InfoItem label="Phone" value={patient.phone || "Not provided"} />
                    <InfoItem label="Occupation" value={patient.occupation || "Not provided"} />
                    <InfoItem label="Address" value={patient.address || "Not provided"} />
                    <InfoItem label="Last Visit" value={patient.lastVisit || "N/A"} />
                    <InfoItem label="Insurance Provider" value={patient.insuranceProvider || "N/A"} />
                </CardContent>
            </Card>

            {/* Doctor Notes */}
            <Card className="shadow-md rounded-2xl border border-border bg-background">
                <CardHeader className="pb-2">
                    <CardTitle className="text-xl font-semibold text-primary">
                        Add Doctor&#39;s Note
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="notes" className="text-muted-foreground font-medium">
                            Write your findings, diagnosis, or prescriptions.
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
                        className="w-full sm:w-auto text-white"
                    >
                        {loading ? "Saving..." : "Submit Note"}
                    </Button>
                </CardContent>
            </Card>
        </main>
    );
}

// Reusable info item with visual alignment
function InfoItem({ label, value }: { label: string; value: string }) {
    return (
        <p className="leading-relaxed">
            <span className="font-medium text-foreground">{label}:</span>{" "}
            <span className="ml-1">{value}</span>
        </p>
    );
}
