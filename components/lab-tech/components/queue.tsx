"use client";

import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Table, TableHeader, TableRow, TableCell, TableBody } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectItem } from "@/components/ui/select";




export function ViewQueue() {
    const mockQueue = [
        { id: "1", name: "John Doe", test: "Blood Test", status: "Pending" },
        { id: "2", name: "Jane Smith", test: "Urine Test", status: "In Progress" },
    ];

    return (
        <section className="w-full max-w-4xl mx-auto p-6 space-y-6">
            <h1 className="text-2xl font-bold text-blue-900">Current Lab Queue</h1>
            <Card className="shadow-sm border border-gray-200">
                <CardContent className="p-4">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableCell>ID</TableCell>
                                <TableCell>Name</TableCell>
                                <TableCell>Test</TableCell>
                                <TableCell>Status</TableCell>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {mockQueue.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell>{item.id}</TableCell>
                                    <TableCell>{item.name}</TableCell>
                                    <TableCell>{item.test}</TableCell>
                                    <TableCell>{item.status}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </section>
    );
}