'use client';

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { FiEye, FiUserCheck } from "react-icons/fi";

import { getAllPatients } from "@/actions/front-desk/get.patients";
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

    const { data: patients = [], isPending, isError } = useQuery<Patient[]>({
        queryKey: ["patients"],
        queryFn: getAllPatients,
        staleTime: 1000 * 60 * 2,
        cacheTime: 1000 * 60 * 10,
        select: (data) => Array.isArray(data) ? data : [],
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
            admitted: "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-300 border border-yellow-300 dark:border-yellow-700",
            discharged: "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300 border border-green-300 dark:border-green-700",
            'under-observation': "bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-300 border border-orange-300 dark:border-orange-700",
            "no-status": "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 border border-red-300 dark:border-red-700",
        };

        return (
            <Badge variant="outline" className={`rounded-xl px-3 py-1 font-semibold text-xs ${statusColors[status]}`}>
                {status?.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())}
            </Badge>
        );
    };

    return (
        <Card className="mt-6 shadow-xl border-0 bg-gradient-to-br from-white via-red-50 to-red-100 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900 rounded-3xl">
            <CardHeader className="pb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <CardTitle className="text-2xl font-bold text-red-800 dark:text-red-200 flex items-center gap-3">
                    Patient Queue
                </CardTitle>
                <Input
                    placeholder="Search by name"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full md:w-64 bg-white/80 dark:bg-gray-800 border border-red-200 dark:border-gray-700 focus:ring-2 focus:ring-red-400 dark:focus:ring-red-600 rounded-xl shadow-sm"
                />
            </CardHeader>

            <CardContent>
                {isPending ? (
                    <div className="flex flex-col items-center justify-center py-10">
                        <svg className="animate-spin h-8 w-8 text-red-400 dark:text-red-300 mb-2" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                        </svg>
                        <span className="text-red-700 dark:text-red-300 font-medium">Loading patients...</span>
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-xl shadow-inner">
                        <Table className="min-w-full">
                            <TableHeader className="bg-red-100 dark:bg-gray-800">
                                <TableRow>
                                    <TableHead className="text-red-700 dark:text-red-200 font-semibold">ID</TableHead>
                                    <TableHead className="text-red-700 dark:text-red-200 font-semibold">Name</TableHead>
                                    <TableHead className="text-red-700 dark:text-red-200 font-semibold">Gender</TableHead>
                                    <TableHead className="text-red-700 dark:text-red-200 font-semibold">Birth Date</TableHead>
                                    <TableHead className="text-red-700 dark:text-red-200 font-semibold">Status</TableHead>
                                    <TableHead className="text-right text-red-700 dark:text-red-200 font-semibold">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredPatients.length > 0 ? (
                                    filteredPatients.map((patient) => (
                                        <TableRow key={patient.userId} className="hover:bg-red-50/60 dark:hover:bg-gray-800 transition">
                                            <TableCell className="font-mono text-xs text-gray-500 dark:text-gray-400">{patient.userId}</TableCell>
                                            <TableCell className="font-semibold text-red-900 dark:text-red-200">{patient.name}</TableCell>
                                            <TableCell className="capitalize text-gray-700 dark:text-gray-300">{patient.gender}</TableCell>
                                            <TableCell className="text-gray-600 dark:text-gray-400">
                                                {typeof patient.birthDate === "string"
                                                    ? new Date(patient.birthDate).toLocaleDateString()
                                                    : patient.birthDate.toLocaleDateString()}
                                            </TableCell>
                                            <TableCell>{renderStatusBadge(patient.status)}</TableCell>
                                            <TableCell className="flex justify-end gap-2">
                                                {patient.status === "admitted" && (
                                                    <Button
                                                        size="sm"
                                                        className="bg-gradient-to-r from-red-600 to-red-400 dark:from-red-900 dark:to-red-700 text-white rounded-xl shadow hover:from-red-700 hover:to-red-500"
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
                                                        className="border-red-400 text-red-600 dark:border-red-500 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900 rounded-xl"
                                                        onClick={() =>
                                                            handleStatusUpdate(patient.userId, "no-status", "Patient Marked as Seen")
                                                        }
                                                    >
                                                        <FiUserCheck className="mr-2" />
                                                        Mark as Seen
                                                    </Button>
                                                )}
                                                <Button size="sm" variant="ghost" className="text-red-700 dark:text-red-200 hover:bg-red-100 dark:hover:bg-gray-800 rounded-xl">
                                                    <FiEye className="mr-2" />
                                                    View
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-10 text-gray-400 dark:text-gray-500">
                                            <svg className="mx-auto mb-2 h-8 w-8 text-red-200 dark:text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3" />
                                            </svg>
                                            No patients found.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
