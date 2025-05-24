"use client";

import { useEffect, useState } from "react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

// Dummy patient vitals data
const dummyVitalsData = [
    {
        id: 1,
        name: "John Doe",
        temperature: "37.5°C",
        pulse: "72 bpm",
        bloodPressure: "120/80",
        notes: "Feeling better",
    },
    {
        id: 2,
        name: "Jane Smith",
        temperature: "38.1°C",
        pulse: "85 bpm",
        bloodPressure: "130/85",
        notes: "Slight fever, check tomorrow",
    },
];

// Dummy vitals summary for chart
const summaryData = [
    { name: "Normal", count: 12 },
    { name: "Fever", count: 4 },
    { name: "Hypertension", count: 2 },
    { name: "Hypotension", count: 1 },
];

export default function VitalsCheckinComponent() {
    const [patients, setPatients] = useState(dummyVitalsData);
    const [editId, setEditId] = useState<number | null>(null);
    const [form, setForm] = useState({
        name: "",
        temperature: "",
        pulse: "",
        bloodPressure: "",
        notes: "",
    });

    interface PatientVitals {
        id: number;
        name: string;
        temperature: string;
        pulse: string;
        bloodPressure: string;
        notes: string;
    }

    interface VitalsForm {
        name: string;
        temperature: string;
        pulse: string;
        bloodPressure: string;
        notes: string;
    }

    interface SummaryData {
        name: string;
        count: number;
    }

    const handleEdit = (id: number) => {
        const patient = patients.find((p) => p.id === id);
        if (patient) {
            setForm(patient);
            setEditId(id);
        }
    };

    interface ChangeEvent {
        target: {
            name: string;
            value: string;
        };
    }

    const handleChange = (e: ChangeEvent) => {
        const { name, value } = e.target;
        setForm((prev: VitalsForm) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = () => {
        if (editId !== null) {
            setPatients((prev) =>
                prev.map((p) => (p.id === editId ? { ...p, ...form } : p))
            );
            setEditId(null);
        } else {
            const newPatient = {
                ...form,
                id: patients.length + 1,
            };
            setPatients((prev) => [...prev, newPatient]);
        }
        setForm({ name: "", temperature: "", pulse: "", bloodPressure: "", notes: "" });
    };

    return (
        <div className="grid grid-cols-1 gap-6 p-4 md:grid-cols-2 xl:grid-cols-3">
            <Card className="col-span-1 xl:col-span-2">
                <CardHeader>
                    <CardTitle>Vitals Check-in</CardTitle>
                    <CardDescription>Record or edit patient vitals</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                            <Label htmlFor="name">Patient Name</Label>
                            <Input id="name" name="name" value={form.name} onChange={handleChange} required />
                        </div>
                        <div>
                            <Label htmlFor="temperature">Temperature</Label>
                            <Input id="temperature" name="temperature" value={form.temperature} onChange={handleChange} required />
                        </div>
                        <div>
                            <Label htmlFor="pulse">Pulse</Label>
                            <Input id="pulse" name="pulse" value={form.pulse} onChange={handleChange} required />
                        </div>
                        <div>
                            <Label htmlFor="bloodPressure">Blood Pressure</Label>
                            <Input id="bloodPressure" name="bloodPressure" value={form.bloodPressure} onChange={handleChange} required />
                        </div>
                        <div className="md:col-span-2">
                            <Label htmlFor="notes">Notes</Label>
                            <Textarea id="notes" name="notes" value={form.notes} onChange={handleChange} />
                        </div>
                        <div className="md:col-span-2 text-right">
                            <Button type="submit">{editId !== null ? "Update" : "Submit"}</Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            <Card className="col-span-1 xl:col-span-3">
                <CardHeader>
                    <CardTitle>Recorded Patient Vitals</CardTitle>
                    <CardDescription>List of submitted patient vitals with edit option</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Patient</TableHead>
                                <TableHead>Temperature</TableHead>
                                <TableHead>Pulse</TableHead>
                                <TableHead>Blood Pressure</TableHead>
                                <TableHead>Notes</TableHead>
                                <TableHead>Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {patients.map((p) => (
                                <TableRow key={p.id}>
                                    <TableCell>{p.name}</TableCell>
                                    <TableCell>{p.temperature}</TableCell>
                                    <TableCell>{p.pulse}</TableCell>
                                    <TableCell>{p.bloodPressure}</TableCell>
                                    <TableCell>{p.notes}</TableCell>
                                    <TableCell>
                                        <Button size="sm" onClick={() => handleEdit(p.id)}>Edit</Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Card className="col-span-1 xl:col-span-3">
                <CardHeader>
                    <CardTitle>Vitals Summary</CardTitle>
                    <CardDescription>Visual chart of common vital states</CardDescription>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={summaryData}>
                            <XAxis dataKey="name" />
                            <YAxis allowDecimals={false} />
                            <Tooltip />
                            <Bar dataKey="count" fill="#2563EB" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    );
}