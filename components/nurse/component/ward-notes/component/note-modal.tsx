import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { WardNote } from './types';

interface Props {
    note: WardNote | null;
    isOpen: boolean;
    onClose: () => void;
}

export default function NoteModal({ note, isOpen, onClose }: Props) {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-xl">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold">
                        {note?.patientName}'s Note
                    </DialogTitle>
                    <DialogDescription>{note?.date}</DialogDescription>
                </DialogHeader>
                <div className="text-sm space-y-2 mt-4">
                    <p><strong>Summary:</strong> {note?.summary}</p>
                    <p><strong>Details:</strong></p>
                    <p className="whitespace-pre-wrap">{note?.detailedNote}</p>
                </div>
            </DialogContent>
        </Dialog>
    );
}
  