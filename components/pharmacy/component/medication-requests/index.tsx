
"use client"

import React, { useEffect, useState } from "react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
} from "@/components/ui/pagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { saveAs } from "file-saver";

const mockRequests = [
    {
        id: 1,
        patientName: "John Doe",
        medication: "Amoxicillin",
        date: "2024-05-22",
        requester: "Dr. Lotta",
        status: "pending",
        notes: "Urgent request for infection."
    },
    {
        id: 2,
        patientName: "Jane Smith",
        medication: "Ibuprofen",
        date: "2024-05-21",
        requester: "Dr. Lotta",
        status: "approved",
        notes: "Mild inflammation."
    },
    {
        id: 3,
        patientName: "Ali Bongo",
        medication: "Paracetamol",
        date: "2024-05-20",
        requester: "Dr. Lotta",
        status: "declined",
        notes: "Double check with attending doctor."
    },
];

export default function MedicationRequestsComponent() {
    const [requests, setRequests] = useState(mockRequests);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [page, setPage] = useState(1);
    const pageSize = 5;

    const filtered = requests.filter(
        (req) =>
            (req.patientName.toLowerCase().includes(search.toLowerCase()) ||
                req.medication.toLowerCase().includes(search.toLowerCase())) &&
            (statusFilter === "all" || req.status === statusFilter)
    );

    const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
    const totalPages = Math.ceil(filtered.length / pageSize);

    const updateStatus = (id: number, status: string) => {
        setRequests((prev) =>
            prev.map((req) => (req.id === id ? { ...req, status } : req))
        );
    };

    const exportCSV = () => {
        const csvContent = [
            ["Patient Name", "Medication", "Date", "Status", "Notes"],
            ...filtered.map((r) => [r.patientName, r.medication, r.date, r.status, r.notes]),
        ]
            .map((e) => e.join(","))
            .join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        saveAs(blob, "medication_requests.csv");
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Medication Requests</CardTitle>
                <div className="mt-2 flex gap-2 flex-wrap">
                    <Input
                        placeholder="Search by patient or medication..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-1/3"
                    />
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-40">
                            <SelectValue placeholder="Filter by status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="approved">Approved</SelectItem>
                            <SelectItem value="declined">Declined</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button variant="outline" onClick={exportCSV}>Export CSV</Button>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Patient</TableHead>
                            <TableHead>Medication</TableHead>
                            <TableHead>Requested By</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginated.map((req) => (
                            <TableRow key={req.id}>
                                <TableCell>{req.patientName}</TableCell>
                                <TableCell>{req.medication}</TableCell>
                                <TableCell>{req.requester}</TableCell>
                                <TableCell>{req.date}</TableCell>
                                <TableCell className="capitalize">{req.status}</TableCell>
                                <TableCell className="flex gap-2">
                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <Button size="sm" variant="outline">View Notes</Button>
                                        </DialogTrigger>
                                        <DialogContent className="bg-white dark:bg-gray-900 border border-red-200 dark:border-gray-700 rounded-xl p-6 sm:p-8 max-w-md w-full">
                                            <DialogHeader>
                                                <DialogTitle className="text-red-800 dark:text-red-200 text-lg font-bold">Notes for {req.patientName}</DialogTitle>
                                            </DialogHeader>
                                            <p className="text-sm mt-2 text-gray-700 dark:text-gray-200">{req.notes}</p>
                                        </DialogContent>
                                    </Dialog>
                                    {req.status === "pending" && (
                                        <>
                                            <Button size="sm" onClick={() => updateStatus(req.id, "approved")}>
                                                Approve
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                onClick={() => updateStatus(req.id, "declined")}
                                            >
                                                Decline
                                            </Button>
                                        </>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>

                {totalPages > 1 && (
                    <Pagination className="mt-4">
                        <PaginationContent>
                            {Array.from({ length: totalPages }, (_, i) => (
                                <PaginationItem key={i}>
                                    <PaginationLink
                                        isActive={page === i + 1}
                                        onClick={() => setPage(i + 1)}
                                    >
                                        {i + 1}
                                    </PaginationLink>
                                </PaginationItem>
                            ))}
                        </PaginationContent>
                    </Pagination>
                )}
            </CardContent>
        </Card>
    );
}
