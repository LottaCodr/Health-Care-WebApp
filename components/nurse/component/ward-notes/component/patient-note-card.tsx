import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { WardNote } from './types';

interface Props {
    note: WardNote;
    onViewDetails: () => void;
    onEdit: () => void;
}

export default function PatientNoteCard({ note, onViewDetails, onEdit }: Props) {
    return (
        <div className="border rounded-xl p-4 bg-white shadow-sm flex justify-between items-start">
            <div>
                <h4 className="font-semibold text-lg">{note.patientName}</h4>
                <p className="text-sm text-muted-foreground">{note.date}</p>
                <p className="mt-1">{note.summary}</p>
            </div>
            <div className="space-x-2">
                <Button variant="outline" onClick={onViewDetails}>View</Button>
                <Button variant="ghost" onClick={onEdit}>Edit</Button>
            </div>
        </div>
    );
}
  