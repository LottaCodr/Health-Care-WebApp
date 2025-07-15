import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogTrigger,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { UserIcon, ClipboardList, FileText, CheckCircle2 } from 'lucide-react';

export default function DispenseModal({ prescription }: { prescription: any }) {
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleConfirm = async () => {
        setLoading(true);
        // Simulate async mutation
        setTimeout(() => {
            setLoading(false);
            setSuccess(true);
            console.log('Dispensed', prescription?.id, notes);
        }, 1200);
    };

    const handleDialogOpenChange = (open: boolean) => {
        if (!open) {
            setNotes('');
            setSuccess(false);
            setLoading(false);
        }
    };

    // Defensive: fallback to empty array if medications is undefined or not an array
    const medications: string[] = Array.isArray(prescription?.medications)
        ? prescription.medications
        : typeof prescription?.medications === 'string'
            ? prescription.medications.split(',').map((m: string) => m.trim()).filter(Boolean)
            : [];

    return (
        <Dialog onOpenChange={handleDialogOpenChange}>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className="text-red-700 border-red-200 hover:bg-red-50 transition-colors duration-150 font-semibold flex items-center gap-2 shadow-sm"
                    disabled={prescription?.status !== 'pending'}
                    aria-label="Open Dispense Modal"
                >
                    <ClipboardList className="w-4 h-4" />
                    Dispense
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg p-0 overflow-hidden rounded-xl shadow-2xl">
                <DialogHeader className="bg-red-50 px-8 py-5 border-b">
                    <DialogTitle className="flex items-center gap-3 text-red-800 text-lg font-bold">
                        <ClipboardList className="w-6 h-6" />
                        Dispense Medication
                    </DialogTitle>
                </DialogHeader>
                <div className="px-8 py-6 bg-white">
                    <div className="mb-5 flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2">
                            <UserIcon className="w-5 h-5 text-red-500" />
                            <span className="font-semibold text-gray-900">{prescription?.patientName || 'Unknown Patient'}</span>
                        </div>
                        <span className="mx-2 text-gray-300 hidden sm:inline">|</span>
                        <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-red-400" />
                            <span className="text-sm text-gray-600">
                                Prescribed by <span className="font-medium">{prescription?.doctorName || 'Unknown Doctor'}</span>
                            </span>
                        </div>
                    </div>
                    <div className="mb-5">
                        <div className="font-semibold text-gray-700 mb-2">Medications:</div>
                        <ul className="list-none pl-0 space-y-2">
                            {medications.length > 0 ? (
                                medications.map((med: string, i: number) => (
                                    <li
                                        key={i}
                                        className="flex items-center gap-2 bg-red-50 rounded px-3 py-1 text-gray-900 text-sm"
                                    >
                                        <span className="inline-block w-2 h-2 rounded-full bg-red-400" />
                                        {med}
                                    </li>
                                ))
                            ) : (
                                <li className="text-gray-400 italic px-3 py-1">No medications listed.</li>
                            )}
                        </ul>
                    </div>
                    <div className="mb-5">
                        <label
                            className="block text-sm font-semibold text-gray-700 mb-2"
                            htmlFor={`notes-${prescription?.id ?? 'unknown'}`}
                        >
                            Dispensing Notes{' '}
                            <span className="text-gray-400 font-normal">(optional)</span>
                        </label>
                        <Textarea
                            id={`notes-${prescription?.id ?? 'unknown'}`}
                            className="w-full border-red-200 focus:border-red-400 focus:ring-red-200 transition"
                            rows={3}
                            placeholder="Add any relevant notes for this dispense..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            disabled={loading || success}
                            maxLength={300}
                        />
                        <div className="text-xs text-gray-400 text-right mt-1">
                            {notes.length}/300
                        </div>
                    </div>
                    {success && (
                        <div className="flex items-center gap-2 mt-3 text-green-800 bg-green-50 border border-green-200 rounded px-4 py-2 animate-fade-in">
                            <CheckCircle2 className="w-5 h-5" />
                            <span className="font-medium">Dispense confirmed!</span>
                        </div>
                    )}
                </div>
                <DialogFooter className="bg-gray-50 px-8 py-4 flex justify-end gap-3 border-t">
                    <DialogClose asChild>
                        <Button
                            variant="ghost"
                            disabled={loading}
                            className="text-gray-600 hover:bg-gray-100 transition"
                        >
                            Cancel
                        </Button>
                    </DialogClose>
                    <Button
                        onClick={handleConfirm}
                        disabled={loading || success}
                        className="bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-2 rounded transition flex items-center gap-2 shadow"
                        aria-busy={loading}
                    >
                        {loading ? (
                            <span className="flex items-center gap-2">
                                <span className="inline-block w-4 h-4 border-2 border-red-200 border-t-red-600 rounded-full animate-spin" />
                                Dispensing...
                            </span>
                        ) : (
                            <>
                                <CheckCircle2 className="w-4 h-4" />
                                Confirm Dispense
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}