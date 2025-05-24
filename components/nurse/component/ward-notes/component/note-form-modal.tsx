import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useEffect, useState } from 'react';
import { NoteFormData, WardNote } from './types';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: NoteFormData, editingId?: string) => void;
    editingNote?: WardNote | null;
}

export default function NoteFormModal({ isOpen, onClose, onSubmit, editingNote }: Props) {
    const [form, setForm] = useState<NoteFormData>({
        patientName: '',
        date: '',
        summary: '',
        detailedNote: '',
    });

    useEffect(() => {
        if (editingNote) {
            setForm({
                patientName: editingNote.patientName,
                date: editingNote.date,
                summary: editingNote.summary,
                detailedNote: editingNote.detailedNote,
            });
        } else {
            setForm({ patientName: '', date: '', summary: '', detailedNote: '' });
        }
    }, [editingNote]);

    const handleChange = (field: keyof NoteFormData, value: string) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const handleSubmit = () => {
        if (!form.patientName || !form.date || !form.summary) return;
        onSubmit(form, editingNote?.id);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-xl">
                <DialogHeader>
                    <DialogTitle>{editingNote ? 'Edit Note' : 'Add New Note'}</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <Input
                        placeholder="Patient Name"
                        value={form.patientName}
                        onChange={(e) => handleChange('patientName', e.target.value)}
                    />
                    <Input
                        type="date"
                        value={form.date}
                        onChange={(e) => handleChange('date', e.target.value)}
                    />
                    <Textarea
                        placeholder="Summary"
                        value={form.summary}
                        onChange={(e) => handleChange('summary', e.target.value)}
                    />
                    <Textarea
                        placeholder="Detailed Note"
                        rows={5}
                        value={form.detailedNote}
                        onChange={(e) => handleChange('detailedNote', e.target.value)}
                    />

                    <Button className="w-full" onClick={handleSubmit}>
                        {editingNote ? 'Update Note' : 'Create Note'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
