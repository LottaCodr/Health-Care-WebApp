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
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100 border rounded-xl p-4 shadow-sm flex justify-between items-start">
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
  