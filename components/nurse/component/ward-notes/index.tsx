'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import NoteModal from './component/note-modal';
import SearchAndFilter from './component/search-filter';
import PatientNoteCard from './component/patient-note-card';
import { WardNote } from './component/types';


const mockNotes: WardNote[] = [
    {
        id: 'n1',
        patientName: 'John Doe',
        date: '2025-05-22',
        summary: 'Patient responded well to medication. Vitals stable.',
        detailedNote: 'BP: 120/80, HR: 78. Continues antihypertensive therapy.',
    },
    {
        id: 'n2',
        patientName: 'Jane Smith',
        date: '2025-05-21',
        summary: 'Complains of chest discomfort. Awaiting lab results.',
        detailedNote: 'Pain score 6/10. ECG performed, pending review.',
    },
];

const RECORDS_PER_PAGE = 4;

export default function WardRoundNotesComponent() {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedNote, setSelectedNote] = useState<WardNote | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);

    const filteredNotes = useMemo(() => {
        return mockNotes.filter((note) =>
            note.patientName.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [searchQuery]);

    const totalPages = Math.ceil(filteredNotes.length / RECORDS_PER_PAGE);
    const paginatedNotes = useMemo(() => {
        const start = (currentPage - 1) * RECORDS_PER_PAGE;
        return filteredNotes.slice(start, start + RECORDS_PER_PAGE);
    }, [filteredNotes, currentPage]);

    return (
        <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
            <SearchAndFilter searchQuery={searchQuery} setSearchQuery={setSearchQuery} />

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
                                onViewDetails={() => {
                                    setSelectedNote(note);
                                    setIsModalOpen(true);
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
                            <PaginationPrevious
                                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                            />
                        </PaginationItem>
                        <PaginationItem>
                            <span className="text-sm px-3">Page {currentPage} of {totalPages}</span>
                        </PaginationItem>
                        <PaginationItem>
                            <PaginationNext
                                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                            />
                        </PaginationItem>
                    </PaginationContent>
                </Pagination>
            )}

            <NoteModal
                note={selectedNote}
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setSelectedNote(null);
                }}
            />
        </div>
    );
}
