"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableCell } from "@/components/ui/table";



export function PatientRecordsComponent() {
    const mockRecords = [
        { id: "P001", name: "Alice Brown", test: "CBC", result: "Normal" },
        { id: "P002", name: "Bob White", test: "Malaria", result: "Positive" },
    ];

    return (
        <section className="w-full max-w-4xl mx-auto p-6 space-y-6">
            <h1 className="text-2xl font-bold text-blue-900">Patient Records</h1>
            <Card className="shadow-sm border border-gray-200">
                <CardContent className="p-4">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableCell>Patient ID</TableCell>
                                <TableCell>Name</TableCell>
                                <TableCell>Test</TableCell>
                                <TableCell>Result</TableCell>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {mockRecords.map((record) => (
                                <TableRow key={record.id}>
                                    <TableCell>{record.id}</TableCell>
                                    <TableCell>{record.name}</TableCell>
                                    <TableCell>{record.test}</TableCell>
                                    <TableCell>{record.result}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </section>
    );
}
