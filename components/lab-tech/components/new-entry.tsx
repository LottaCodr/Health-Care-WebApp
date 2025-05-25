"use client";

import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function NewLabEntry() {
    const [patientId, setPatientId] = useState("");
    const [testType, setTestType] = useState("");
    const [notes, setNotes] = useState("");
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!patientId || !testType) {
            toast({
                title: "Missing Fields",
                description: "Patient ID and Test Type are required.",
                variant: "destructive",
            });
            return;
        }

        setLoading(true);

        try {
            await new Promise((resolve) => setTimeout(resolve, 1500));

            toast({
                title: "Lab Entry Submitted",
                description: "The lab test has been recorded successfully.",
            });

            setPatientId("");
            setTestType("");
            setNotes("");
        } catch (error) {
            toast({
                title: "Submission Failed",
                description: "An error occurred while submitting the form.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="w-full max-w-2xl mx-auto p-6 space-y-6">
            <h1 className="text-2xl font-bold text-blue-900">New Lab Entry</h1>

            <Card className="shadow-sm border border-gray-200">
                <CardContent className="p-6">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="patientId">Patient ID <span className="text-red-500">*</span></Label>
                            <Input
                                id="patientId"
                                value={patientId}
                                onChange={(e) => setPatientId(e.target.value)}
                                placeholder="e.g. P-10239"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="testType">Test Type <span className="text-red-500">*</span></Label>
                            <Input
                                id="testType"
                                value={testType}
                                onChange={(e) => setTestType(e.target.value)}
                                placeholder="e.g. Blood Test"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="notes">Notes</Label>
                            <Textarea
                                id="notes"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Optional notes or comments"
                            />
                        </div>

                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <Loader2 className="animate-spin h-4 w-4" />
                                    Submitting...
                                </span>
                            ) : (
                                "Submit Entry"
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </section>
    );
}
