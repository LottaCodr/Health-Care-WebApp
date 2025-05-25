"use client";

import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
export function UploadResult() {
    const [form, setForm] = useState({ patientId: "", result: "" });
    const [loading, setLoading] = useState(false);

    const toast = useToast()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        setTimeout(() => {
            toast.toast({
                title: "Success",
                description: "Lab result uploaded successfully",
                variant: "default",
            });
            setForm({ patientId: "", result: "" });
            setLoading(false);
        }, 1200);
    };

    return (
        <section className="w-full max-w-2xl mx-auto p-6 space-y-6">
            <h1 className="text-2xl font-bold text-blue-900">Upload Lab Result</h1>
            <Card className="shadow-sm border border-gray-200">
                <CardContent className="p-6">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="patientId">Patient ID</Label>
                            <Input
                                id="patientId"
                                value={form.patientId}
                                onChange={(e) => setForm({ ...form, patientId: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="result">Lab Result</Label>
                            <Textarea
                                id="result"
                                value={form.result}
                                onChange={(e) => setForm({ ...form, result: e.target.value })}
                                required
                            />
                        </div>
                        <Button type="submit" disabled={loading} className="w-full">
                            {loading ? "Uploading..." : "Upload Result"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </section>
    );
}

function setTimeout(arg0: () => void, arg1: number) {
    throw new Error("Function not implemented.");
}
