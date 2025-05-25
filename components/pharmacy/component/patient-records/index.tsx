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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination, PaginationContent, PaginationItem, PaginationLink } from "@/components/ui/pagination";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { saveAs } from "file-saver";

// Live data simulation / backend integration
const fetchPatientRecords = async () => {
    const response = await fetch("/api/patients");
    return await response.json();
};

type PatientRecord = {
    id: number;
    name: string;
    dob: string;
    lastVisit: string;
    prescriptions: string[];
};

export function PatientRecordsComponent() {
    const [records, setRecords] = useState<PatientRecord[]>([]);
    const [filtered, setFiltered] = useState<PatientRecord[]>([]);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [sort, setSort] = useState("desc");
    const pageSize = 5;

    useEffect(() => {
        fetchPatientRecords().then((data) => {
            setRecords(data);
            setFiltered(sortRecords(data, sort));
        });
    }, [sort]);

    useEffect(() => {
        const filtered = records
            .filter((record) =>
                record.name.toLowerCase().includes(search.toLowerCase())
            );
        setFiltered(sortRecords(filtered, sort));
        setPage(1);
    }, [search, records, sort]);

    const sortRecords = (data: PatientRecord[], direction: string) => {
        return [...data].sort((a, b) =>
            direction === "asc"
                ? new Date(a.lastVisit).getTime() - new Date(b.lastVisit).getTime()
                : new Date(b.lastVisit).getTime() - new Date(a.lastVisit).getTime()
        );
    };

    const exportCSV = () => {
        const headers = "ID,Name,DOB,Last Visit,Prescriptions\n";
        const rows = filtered.map(r => `${r.id},${r.name},${r.dob},${r.lastVisit},"${r.prescriptions.join(";")}"`).join("\n");
        const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8" });
        saveAs(blob, "patient-records.csv");
    };

    const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
    const totalPages = Math.ceil(filtered.length / pageSize);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Patient Records</CardTitle>
                <div className="mt-2 flex flex-wrap gap-2 items-center justify-between">
                    <Input
                        placeholder="Search patients by name..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full sm:w-1/3"
                    />
                    <Select value={sort} onValueChange={setSort}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Sort by Last Visit" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="desc">Newest First</SelectItem>
                            <SelectItem value="asc">Oldest First</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button onClick={exportCSV}>Export CSV</Button>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Patient Name</TableHead>
                            <TableHead>Date of Birth</TableHead>
                            <TableHead>Last Visit</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginated.map((record) => (
                            <TableRow key={record.id}>
                                <TableCell>{record.name}</TableCell>
                                <TableCell>{record.dob}</TableCell>
                                <TableCell>{record.lastVisit}</TableCell>
                                <TableCell>
                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <Button size="sm">View Summary</Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>{record.name}&#39;s Prescription Summary</DialogTitle>
                                            </DialogHeader>
                                            <ul className="mt-2 space-y-1">
                                                {record.prescriptions.map((med, idx) => (
                                                    <li key={idx} className="text-sm">{med}</li>
                                                ))}
                                            </ul>
                                            <div className="mt-4">
                                                <Input placeholder="Add prescription..." className="mb-2" />
                                                <Button>Add</Button>
                                            </div>
                                        </DialogContent>
                                    </Dialog>
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

export default PatientRecordsComponent;
