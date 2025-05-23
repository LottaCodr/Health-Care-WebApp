"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
// import { useToast } from "@/components/ui/use-toast";
import { FiSearch, FiUserCheck, FiEye } from "react-icons/fi";
import { useToast } from "@/hooks/use-toast";

type PatientStatus = "waiting" | "called" | "seen";

type Patient = {
    id: string;
    fullName: string;
    gender: string;
    age: number;
    queueTime: string;
    status: PatientStatus;
};

const mockPatients: Patient[] = [
    {
        id: "PT001",
        fullName: "Jane Doe",
        gender: "Female",
        age: 30,
        queueTime: "10:30 AM",
        status: "waiting",
    },
    {
        id: "PT002",
        fullName: "John Smith",
        gender: "Male",
        age: 45,
        queueTime: "10:40 AM",
        status: "called",
    },
    {
        id: "PT003",
        fullName: "Sarah Lee",
        gender: "Female",
        age: 27,
        queueTime: "10:50 AM",
        status: "seen",
    },
];

export default function PatientQueueComponent() {
    const [patients, setPatients] = React.useState(mockPatients);
    const [search, setSearch] = React.useState("");
    const { toast } = useToast();

    const handleCallPatient = (id: string) => {
        setPatients((prev) =>
            prev.map((p) => (p.id === id ? { ...p, status: "called" } : p))
        );

        toast({
            title: "Patient Called",
            description: `Patient ${id} has been notified.`,
        });
    };

    const handleMarkAsSeen = (id: string) => {
        setPatients((prev) =>
            prev.map((p) => (p.id === id ? { ...p, status: "seen" } : p))
        );

        toast({
            title: "Patient Seen",
            description: `Patient ${id} has been marked as seen.`,
        });
    };

    const filteredPatients = patients.filter((p) =>
        p.fullName.toLowerCase().includes(search.toLowerCase())
    );

    const getStatusBadge = (status: PatientStatus) => {
        switch (status) {
            case "waiting":
                return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Waiting</Badge>;
            case "called":
                return <Badge variant="outline" className="bg-blue-100 text-blue-800">Called</Badge>;
            case "seen":
                return <Badge variant="outline" className="bg-green-100 text-green-800">Seen</Badge>;
        }
    };

    return (
        <Card className="mt-4">
            <CardHeader>
                <CardTitle className="flex justify-between items-center">
                    Patient Queue
                    <div className="flex items-center gap-2">
                        <Input
                            placeholder="Search by name"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-64"
                        />
                    </div>
                </CardTitle>
            </CardHeader>

            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>ID</TableHead>
                            <TableHead>Full Name</TableHead>
                            <TableHead>Gender</TableHead>
                            <TableHead>Age</TableHead>
                            <TableHead>Queued At</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredPatients.map((p) => (
                            <TableRow key={p.id}>
                                <TableCell>{p.id}</TableCell>
                                <TableCell>{p.fullName}</TableCell>
                                <TableCell>{p.gender}</TableCell>
                                <TableCell>{p.age}</TableCell>
                                <TableCell>{p.queueTime}</TableCell>
                                <TableCell>{getStatusBadge(p.status)}</TableCell>
                                <TableCell className="flex justify-end gap-2">
                                    {p.status === "waiting" && (
                                        <Button size="sm" onClick={() => handleCallPatient(p.id)}>
                                            <FiUserCheck className="mr-2" /> Call
                                        </Button>
                                    )}
                                    {p.status === "called" && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleMarkAsSeen(p.id)}
                                        >
                                            <FiUserCheck className="mr-2" /> Mark as Seen
                                        </Button>
                                    )}
                                    <Button size="sm" variant="ghost">
                                        <FiEye className="mr-2" /> View
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {filteredPatients.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-6 text-gray-500">
                                    No patients in the queue.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
