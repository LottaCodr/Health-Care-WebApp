'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';

import { Plus } from 'lucide-react';
import { NoteFormData, WardNote } from './component/types';
import SearchAndFilter from './component/search-filter';
import PatientNoteCard from './component/patient-note-card';
import NoteFormModal from './component/note-form-modal';
import NoteModal from './component/note-modal';

const RECORDS_PER_PAGE = 4;

export default function WardRoundNotesComponent() {
    const [notes, setNotes] = useState<WardNote[]>([
        {
            id: '1',
            patientName: 'John Doe',
            date: '2025-05-22',
            summary: 'Stable. Responding to meds.',
            detailedNote: 'Vitals normal. Continuing same medication.',
        },
    ]);

    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    const [viewNote, setViewNote] = useState<WardNote | null>(null);
    const [editingNote, setEditingNote] = useState<WardNote | null>(null);
    const [formModalOpen, setFormModalOpen] = useState(false);

    const filteredNotes = useMemo(() => {
        return notes.filter((n) =>
            n.patientName.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [searchQuery, notes]);

    const totalPages = Math.ceil(filteredNotes.length / RECORDS_PER_PAGE);
    const paginatedNotes = useMemo(() => {
        const start = (currentPage - 1) * RECORDS_PER_PAGE;
        return filteredNotes.slice(start, start + RECORDS_PER_PAGE);
    }, [filteredNotes, currentPage]);

    const handleAddOrUpdateNote = (data: NoteFormData, editingId?: string) => {
        if (editingId) {
            setNotes((prev) =>
                prev.map((note) =>
                    note.id === editingId ? { ...note, ...data } : note
                )
            );
        } else {
            setNotes((prev) => [
                { id: Date.now().toString(), ...data },
                ...prev,
            ]);
        }
    };

    return (
        <div className="max-w-5xl mx-6 px-6 py-8 space-y-6">
            <div className="flex justify-between items-center">
                <SearchAndFilter searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
                <Button onClick={() => setFormModalOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" /> Add Note
                </Button>
            </div>

            <Card className="rounded-2xl shadow-sm border">
                <CardHeader>
                    <CardTitle className="text-2xl">Ward Round Notes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {paginatedNotes.length === 0 ? (
                        <p className="text-center text-muted-foreground">No notes found.</p>
                    ) : (
                        paginatedNotes.map((note) => (
                            <PatientNoteCard
                                key={note.id}
                                note={note}
                                onViewDetails={() => setViewNote(note)}
                                onEdit={() => {
                                    setEditingNote(note);
                                    setFormModalOpen(true);
                                }}
                            />
                        ))
                    )}
                </CardContent>
            </Card>

            {totalPages > 1 && (
                <Pagination>
                    <PaginationContent>
                        <PaginationItem>
                            <PaginationPrevious onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))} />
                        </PaginationItem>
                        <PaginationItem>
                            <span className="text-sm px-3">Page {currentPage} of {totalPages}</span>
                        </PaginationItem>
                        <PaginationItem>
                            <PaginationNext onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))} />
                        </PaginationItem>
                    </PaginationContent>
                </Pagination>
            )}

            <NoteModal
                note={viewNote}
                isOpen={!!viewNote}
                onClose={() => setViewNote(null)}
            />

            <NoteFormModal
                isOpen={formModalOpen}
                onClose={() => {
                    setFormModalOpen(false);
                    setEditingNote(null);
                }}
                onSubmit={handleAddOrUpdateNote}
                editingNote={editingNote}
            />
        </div>
    );
}
