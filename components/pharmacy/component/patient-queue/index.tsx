"use client"

import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectItem, SelectContent } from "@/components/ui/select";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";

// Mock API
const fetchPatientQueue = () => [
    { id: 1, name: "John Doe", status: "Waiting", history: "Prescribed Ibuprofen last visit." },
    { id: 2, name: "Jane Smith", status: "Waiting", history: "Allergic to Penicillin." },
    { id: 3, name: "Carlos Vega", status: "Attended", history: "Diabetic patient, insulin administered." },
    { id: 4, name: "Mary Johnson", status: "Waiting", history: "Routine check-up pending medication refill." },
    { id: 5, name: "James Lee", status: "Waiting", history: "Needs new asthma inhaler." },
    { id: 6, name: "Emily Brown", status: "Waiting", history: "Prescribed antibiotics for infection." },
];

type Patient = { id: number; name: string; status: string; history: string };

export default function PatientQueueComponent() {
    const [patients, setPatients] = useState<Patient[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
    const pageSize = 4;

    useEffect(() => {
        setPatients(fetchPatientQueue());
    }, []);

    interface HandleAttend {
        (id: number): void;
    }

    const handleAttend: HandleAttend = (id) => {
        setPatients((prev) =>
            prev.map((p) => (p.id === id ? { ...p, status: "Attended" } : p))
        );
    };

    const filtered = patients.filter(
        (p) =>
            (statusFilter === "All" || p.status === statusFilter) &&
            p.name.toLowerCase().includes(search.toLowerCase())
    );

    const paginated = filtered.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize
    );

    return (
        <Card>
            <CardContent>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">Patient Queue</h2>
                    <div className="flex gap-2">
                        <Input
                            placeholder="Search by name"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-48"
                        />
                        <Select value={statusFilter}
                            onValueChange={setStatusFilter}
                        >
                            <SelectContent>
                                <SelectItem value="All">All</SelectItem>
                                <SelectItem value="Waiting">Waiting</SelectItem>
                                <SelectItem value="Attended">Attended</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <ul className="space-y-3">
                    {paginated.map((p) => (
                        <li
                            key={p.id}
                            className="border rounded p-3 flex justify-between items-center"
                        >
                            <div>
                                <p className="font-medium">{p.name}</p>
                                <p className="text-sm text-gray-500">Status: {p.status}</p>
                            </div>
                            <div className="flex gap-2">
                                <Dialog>
                                    <DialogTrigger asChild>
                                        <Button
                                            variant="outline"
                                            onClick={() => setSelectedPatient(p)}
                                        >
                                            View History
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="bg-white dark:bg-gray-900 border border-red-200 dark:border-gray-700 rounded-xl p-6 sm:p-8 max-w-md w-full">
                                        <h3 className="text-lg font-semibold mb-2 text-red-800 dark:text-red-200">Patient Summary</h3>
                                        <p className="mb-2 text-sm text-gray-700 dark:text-gray-200">{selectedPatient?.history}</p>
                                        <Button
                                            onClick={() => {
                                                handleAttend(p.id);
                                            }}
                                            className="bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-2 rounded transition w-full"
                                        >
                                            Mark as Attended
                                        </Button>
                                    </DialogContent>
                                </Dialog>
                            </div>
                        </li>
                    ))}
                </ul>
                {/* Replace this with your own pagination logic or update the Pagination component to accept these props */}
                <div className="mt-4 flex justify-center gap-2">
                    <Button
                        variant="outline"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    >
                        Previous
                    </Button>
                    <span className="px-2 py-1">{currentPage} / {Math.ceil(filtered.length / pageSize)}</span>
                    <Button
                        variant="outline"
                        disabled={currentPage === Math.ceil(filtered.length / pageSize) || filtered.length === 0}
                        onClick={() =>
                            setCurrentPage((p) =>
                                Math.min(Math.ceil(filtered.length / pageSize), p + 1)
                            )
                        }
                    >
                        Next
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
