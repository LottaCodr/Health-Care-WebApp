'use client';

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { FiEye, FiUserCheck } from "react-icons/fi";

import { getAllPatients } from "@/actions/patients/get.patients";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { usePatientContext } from "@/context/patients/patient-context";
import { Patient, PatientStatus } from "@/context/patients/types";

export default function PatientQueueComponent() {
    const [search, setSearch] = React.useState("");
    const { toast } = useToast();
    const { dispatch } = usePatientContext();

    const { data: patients = [], isPending } = useQuery<Patient[]>({
        queryKey: ["patients"],
        queryFn: getAllPatients,
    });

    const handleStatusUpdate = (id: string, status: PatientStatus, message: string) => {
        dispatch({ type: "UPDATE_PATIENT", payload: { id, status } });
        toast({ title: message, description: `Patient ${id} has been updated.` });
    };

    const filteredPatients = React.useMemo(() => {
        return patients.filter((p) =>
            p.name?.toLowerCase().includes(search.toLowerCase())
        );
    }, [patients, search]);

    const renderStatusBadge = (status: PatientStatus) => {
        const statusColors: Record<PatientStatus, string> = {
            admitted: "bg-yellow-100 text-yellow-800",
            discharged: "bg-green-100 text-green-800",
            'under-observation': "bg-orange-100 text-green-800",
            "no-status": "bg-blue-100 text-blue-800",
        };

        return (
            <Badge variant="outline" className={statusColors[status]}>
                {status?.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())}
            </Badge>
        );
    };

    return (
        <Card className="mt-4">
            <CardHeader>
                <CardTitle className="flex justify-between items-center">
                    Patient Queue
                    <Input
                        placeholder="Search by name"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-64"
                    />
                </CardTitle>
            </CardHeader>

            <CardContent>
                {isPending ? (
                    <div className="text-center py-6 text-gray-500">Loading patients...</div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>ID</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Gender</TableHead>
                                <TableHead>Birth Date</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredPatients.length > 0 ? (
                                filteredPatients.map((patient) => (
                                    <TableRow key={patient.userId}>
                                        <TableCell>{patient.userId}</TableCell>
                                        <TableCell>{patient.name}</TableCell>
                                        <TableCell>{patient.gender}</TableCell>
                                        <TableCell>
                                            {typeof patient.birthDate === "string"
                                                ? new Date(patient.birthDate).toLocaleDateString()
                                                : patient.birthDate.toLocaleDateString()}
                                        </TableCell>
                                        <TableCell>{renderStatusBadge(patient.status)}</TableCell>
                                        <TableCell className="flex justify-end gap-2">
                                            {patient.status === "admitted" && (
                                                <Button
                                                    size="sm"
                                                    onClick={() =>
                                                        handleStatusUpdate(patient.userId, "discharged", "Patient Discharged")
                                                    }
                                                >
                                                    <FiUserCheck className="mr-2" />
                                                    Discharge
                                                </Button>
                                            )}
                                            {patient.status === "discharged" && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() =>
                                                        handleStatusUpdate(patient.userId, "no-status", "Patient Marked as Seen")
                                                    }
                                                >
                                                    <FiUserCheck className="mr-2" />
                                                    Mark as Seen
                                                </Button>
                                            )}
                                            <Button size="sm" variant="ghost">
                                                <FiEye className="mr-2" />
                                                View
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-6 text-gray-500">
                                        No patients found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    );
}
