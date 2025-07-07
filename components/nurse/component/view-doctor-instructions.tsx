'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { NursingAction } from '@/actions/nursing-action/types';

interface Props {
    task: NursingAction;
    onClose: () => void;
}

export default function ViewDoctorInstructions({ task, onClose }: Props) {
    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Doctor's Instructions</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <p><strong>Diagnosis:</strong> {task.doctorDiagnosis}</p>
                    <p><strong>Instructions:</strong> {task.doctorInstructions}</p>
                    <p><strong>Prescribed Medications:</strong> {task.prescribedMedication}</p>
                </div>
                <div className="flex justify-end mt-4">
                    <DialogClose asChild>
                        <Button variant="outline">Close</Button>
                    </DialogClose>
                </div>
            </DialogContent>
        </Dialog>
    );
}
