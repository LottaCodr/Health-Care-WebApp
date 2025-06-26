'use client';

import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { toast } from '@/hooks/use-toast';
import { databases } from '@/lib/appwrite.config';

interface VitalsTreatmentFormProps {
    documentId: string;
    onSuccess?: () => void;
}

export default function VitalsTreatmentForm({ documentId, onSuccess }: VitalsTreatmentFormProps) {
    const [vitals, setVitals] = useState({
        bloodPressure: '',
        temperature: '',
        pulse: '',
        respiratoryRate: '',
    });

    const [treatmentGiven, setTreatmentGiven] = useState('');

    const { mutate, isPending } = useMutation({
        mutationFn: async () => {
            return await databases.updateDocument(
                process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
                process.env.NEXT_PUBLIC_NURSING_ACTIONS_COLLECTION_ID!,
                documentId,
                {
                    vitals,
                    treatmentGiven,
                }
            );
        },
        onSuccess: () => {
            toast.success('Nursing action updated successfully!');
            if (onSuccess) onSuccess();
        },
        onError: () => {
            toast.error('Failed to update nursing action. Please try again.');
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        mutate();
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block mb-1 text-sm font-medium">Blood Pressure</label>
                    <input
                        type="text"
                        value={vitals.bloodPressure}
                        onChange={(e) => setVitals({ ...vitals, bloodPressure: e.target.value })}
                        className="w-full border rounded px-3 py-2"
                        required
                    />
                </div>
                <div>
                    <label className="block mb-1 text-sm font-medium">Temperature</label>
                    <input
                        type="text"
                        value={vitals.temperature}
                        onChange={(e) => setVitals({ ...vitals, temperature: e.target.value })}
                        className="w-full border rounded px-3 py-2"
                        required
                    />
                </div>
                <div>
                    <label className="block mb-1 text-sm font-medium">Pulse</label>
                    <input
                        type="text"
                        value={vitals.pulse}
                        onChange={(e) => setVitals({ ...vitals, pulse: e.target.value })}
                        className="w-full border rounded px-3 py-2"
                        required
                    />
                </div>
                <div>
                    <label className="block mb-1 text-sm font-medium">Respiratory Rate</label>
                    <input
                        type="text"
                        value={vitals.respiratoryRate}
                        onChange={(e) => setVitals({ ...vitals, respiratoryRate: e.target.value })}
                        className="w-full border rounded px-3 py-2"
                        required
                    />
                </div>
            </div>

            <div>
                <label className="block mb-1 text-sm font-medium">Treatment Given</label>
                <textarea
                    value={treatmentGiven}
                    onChange={(e) => setTreatmentGiven(e.target.value)}
                    className="w-full border rounded px-3 py-2"
                    rows={4}
                    required
                />
            </div>

            <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? <Spinner size="sm" /> : 'Submit'}
            </Button>
        </form>
    );
}
