"use client"

import React, { useEffect, useState } from "react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
} from "@/components/ui/pagination";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { format } from "date-fns";

type VisitorEntry = {
    id: number;
    name: string;
    purpose: string;
    timeIn: string;
    timeOut?: string;
    status: "checked-in" | "checked-out";
};

const fetchVisitorData = async (): Promise<VisitorEntry[]> => {
    return [
        {
            id: 1,
            name: "Grace Obi",
            purpose: "Prescription clarification",
            timeIn: "2025-05-23T09:15:00Z",
            timeOut: "2025-05-23T09:35:00Z",
            status: "checked-out",
        },
        {
            id: 2,
            name: "Samson Ade",
            purpose: "Medication refill",
            timeIn: "2025-05-23T10:00:00Z",
            status: "checked-in",
        },
        // More data...
    ];
};

export function VisitorsAndWalkinsComponent() {
    const [data, setData] = useState<VisitorEntry[]>([]);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [page, setPage] = useState(1);
    const pageSize = 5;

    useEffect(() => {
        fetchVisitorData().then(setData);
    }, []);

    const filtered = data.filter((v) => {
        const matchesSearch = v.name.toLowerCase().includes(search.toLowerCase());
        const matchesStatus =
            statusFilter === "all" || v.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
    const totalPages = Math.ceil(filtered.length / pageSize);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Visitors & Walk-ins</CardTitle>
                <div className="mt-3 flex gap-4 flex-wrap">
                    <Input
                        placeholder="Search by name..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full sm:w-64"
                    />
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="border rounded-md px-3 py-2 text-sm"
                    >
                        <option value="all">All Status</option>
                        <option value="checked-in">Checked In</option>
                        <option value="checked-out">Checked Out</option>
                    </select>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Purpose</TableHead>
                            <TableHead>Time In</TableHead>
                            <TableHead>Time Out</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginated.map((visitor) => (
                            <TableRow key={visitor.id}>
                                <TableCell>{visitor.name}</TableCell>
                                <TableCell>{visitor.purpose}</TableCell>
                                <TableCell>{format(new Date(visitor.timeIn), "PPpp")}</TableCell>
                                <TableCell>
                                    {visitor.timeOut ? format(new Date(visitor.timeOut), "PPpp") : "—"}
                                </TableCell>
                                <TableCell className="capitalize">{visitor.status}</TableCell>
                                <TableCell>
                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <Button variant="outline" size="sm">Details</Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>Visitor Details</DialogTitle>
                                            </DialogHeader>
                                            <div className="text-sm space-y-1">
                                                <p><strong>Name:</strong> {visitor.name}</p>
                                                <p><strong>Purpose:</strong> {visitor.purpose}</p>
                                                <p><strong>Time In:</strong> {format(new Date(visitor.timeIn), "PPpp")}</p>
                                                <p><strong>Time Out:</strong> {visitor.timeOut ? format(new Date(visitor.timeOut), "PPpp") : "—"}</p>
                                                <p><strong>Status:</strong> {visitor.status}</p>
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

export default VisitorsAndWalkinsComponent;
