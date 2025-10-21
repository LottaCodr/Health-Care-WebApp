'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useMutation, useQueryClient } from '@tanstack/react-query';
// import { recordVitals } from '@/actions/nurse/record.vitals';
import { toast } from 'sonner';
import { NursingAction } from '@/actions/nursing-action/types';

interface Props {
    task: NursingAction;
    onClose: () => void;
}

export default function RecordVitalsForm({ task, onClose }: Props) {
    const queryClient = useQueryClient();
    const [vitals, setVitals] = useState({
        bloodPressure: '',
        temperature: '',
        heartRate: '',
    });
    const [treatment, setTreatment] = useState('');

    const { mutate, isPending } = useMutation({
        mutationFn: async () => {
            // Replace with your actual call, e.g.
            // return await recordVitals(...);
            return Promise.resolve(); // Dummy promise to satisfy MutationFunction contract
        },
        onSuccess: () => {
            toast.success('Vitals recorded successfully');
            queryClient.invalidateQueries({ queryKey: ['nurse-tasks'] });
            onClose();
        },
        onError: () => {
            toast.error('Failed to record vitals');
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        mutate();
    };

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Record Vitals for {task?.patient?.name}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Blood Pressure</label>
                        <Input
                            required
                            value={vitals.bloodPressure}
                            onChange={(e) => setVitals({ ...vitals, bloodPressure: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Temperature (°C)</label>
                        <Input
                            required
                            value={vitals.temperature}
                            onChange={(e) => setVitals({ ...vitals, temperature: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Heart Rate (bpm)</label>
                        <Input
                            required
                            value={vitals.heartRate}
                            onChange={(e) => setVitals({ ...vitals, heartRate: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Treatment Given</label>
                        <Textarea
                            required
                            value={treatment}
                            onChange={(e) => setTreatment(e.target.value)}
                        />
                    </div>
                    <div className="flex justify-end mt-4">
                        <DialogClose asChild>
                            <Button type="button" variant="outline">Cancel</Button>
                        </DialogClose>
                        <Button type="submit" className="ml-2" disabled={isPending}>
                            {isPending ? 'Recording...' : 'Submit'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
