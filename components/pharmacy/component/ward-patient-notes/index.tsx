"use client"

import React, { useState, useEffect } from "react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Sample API fetch placeholder
type WardRoundNote = {
    id: number;
    patientName: string;
    date: string;
    medicationReview: string;
    pharmacistNote: string;
};

const fetchWardNotes = async (): Promise<WardRoundNote[]> => {
    return [
        {
            id: 1,
            patientName: "John Doe",
            date: "2024-05-23",
            medicationReview: "Reviewed antibiotics, adjusted dosage.",
            pharmacistNote: "Patient stable. No adverse effects noted.",
        },
        {
            id: 2,
            patientName: "Jane Smith",
            date: "2024-05-22",
            medicationReview: "Changed painkiller from Ibuprofen to Acetaminophen.",
            pharmacistNote: "Monitor for pain relief effectiveness.",
        },
    ];
};

export function WardRoundsNotesComponent() {
    const [notes, setNotes] = useState<WardRoundNote[]>([]);
    const [search, setSearch] = useState("");
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [filteredNotes, setFilteredNotes] = useState<WardRoundNote[]>([]);
    const [newNote, setNewNote] = useState({
        patientName: "",
        medicationReview: "",
        pharmacistNote: "",
    });

    useEffect(() => {
        fetchWardNotes().then(data => {
            setNotes(data);
            setFilteredNotes(data);
        });
    }, []);

    useEffect(() => {
        const sorted = [...notes].filter(note =>
            note.patientName.toLowerCase().includes(search.toLowerCase())
        ).sort((a, b) => {
            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();
            return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
        });
        setFilteredNotes(sorted);
    }, [search, notes, sortOrder]);

    const handleAddNote = () => {
        const newEntry = {
            ...newNote,
            id: Date.now(),
            date: new Date().toISOString().split('T')[0],
        };
        setNotes(prev => [newEntry, ...prev]);
        setNewNote({ patientName: "", medicationReview: "", pharmacistNote: "" });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Ward Round Notes</CardTitle>
                <div className="flex justify-between gap-4 mt-2">
                    <Input
                        placeholder="Search patient name..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-1/3"
                    />
                    <Select value={sortOrder} onValueChange={v => setSortOrder(v as 'asc' | 'desc')}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Sort by Date" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="desc">Newest First</SelectItem>
                            <SelectItem value="asc">Oldest First</SelectItem>
                        </SelectContent>
                    </Select>
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button>Add Note</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Add Ward Note</DialogTitle>
                            </DialogHeader>
                            <Input
                                placeholder="Patient Name"
                                value={newNote.patientName}
                                onChange={(e) => setNewNote({ ...newNote, patientName: e.target.value })}
                            />
                            <Textarea
                                placeholder="Medication Review"
                                value={newNote.medicationReview}
                                onChange={(e) => setNewNote({ ...newNote, medicationReview: e.target.value })}
                            />
                            <Textarea
                                placeholder="Pharmacist Note"
                                value={newNote.pharmacistNote}
                                onChange={(e) => setNewNote({ ...newNote, pharmacistNote: e.target.value })}
                            />
                            <Button onClick={handleAddNote}>Save Note</Button>
                        </DialogContent>
                    </Dialog>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Patient</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Medication Review</TableHead>
                            <TableHead>Pharmacist Note</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredNotes.map(note => (
                            <TableRow key={note.id}>
                                <TableCell>{note.patientName}</TableCell>
                                <TableCell>{note.date}</TableCell>
                                <TableCell>{note.medicationReview}</TableCell>
                                <TableCell>{note.pharmacistNote}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

export default WardRoundsNotesComponent;
