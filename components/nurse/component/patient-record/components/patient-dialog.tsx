'use client';


import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PatientRecord } from './data';

interface Props {
    record: PatientRecord | null;
    isOpen: boolean;
    onClose: () => void;
}

export default function PatientDialog({ record, isOpen, onClose }: Props) {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-xl">
                <DialogHeader>
                    <DialogTitle className="text-xl font-semibold">
                        {record?.name}'s Record
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                        Admission ID: {record?.id}
                    </DialogDescription>
                </DialogHeader>

                {record && (
                    <div className="space-y-3 pt-2 text-sm">
                        <p><strong>Age:</strong> {record.age}</p>
                        <p><strong>Gender:</strong> {record.gender}</p>
                        <p><strong>Status:</strong> {record.status}</p>
                        <p><strong>Admitted At:</strong> {record.admittedAt}</p>
                        <p><strong>Diagnosis:</strong> {record.diagnosis}</p>
                        <p><strong>Notes:</strong> {record.notes}</p>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
