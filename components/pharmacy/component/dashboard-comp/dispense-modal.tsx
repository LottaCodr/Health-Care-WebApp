import React, { useState } from 'react';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export default function DispenseModal({ prescription }: { prescription: any }) {
    const [notes, setNotes] = useState('');

    const handleConfirm = () => {
        // call mutation to update status
        console.log('Dispensed', prescription.id);
    };

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline">Dispense</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Dispense Medication</h3>
                <ul className="list-disc pl-5 mb-4">
                    {prescription.medications.map((med: string, i: number) => (
                        <li key={i}>{med}</li>
                    ))}
                </ul>
                <textarea
                    className="w-full p-2 border rounded-md"
                    rows={3}
                    placeholder="Optional notes..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                />
                <div className="mt-4 text-right">
                    <Button onClick={handleConfirm}>Confirm Dispense</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}