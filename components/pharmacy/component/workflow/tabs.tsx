"use client"

import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

// Mock API functions
const fetchMedicationRequests = async () => [
    { id: 1, name: "Amoxicillin", status: "Pending" },
    { id: 2, name: "Ibuprofen", status: "Approved" },
];

const fetchInventoryStatus = async () => [
    { name: "Paracetamol", stock: 20 },
    { name: "Cough Syrup", stock: 5 },
    { name: "Amoxicillin", stock: 0 },
];

const fetchDispensationHistory = async () => [
    { date: "2024-05-01", medication: "Amoxicillin", patient: "John Doe" },
    { date: "2024-05-02", medication: "Ibuprofen", patient: "Jane Smith" },
];

const fetchStockRefill = async () => [
    { date: "2024-04-30", medication: "Paracetamol", quantity: 100 },
];

const fetchInteractionWarnings = async () => [
    { id: 1, message: "Avoid combining Ibuprofen with Aspirin" },
];

type MedicationRequest = {
    id: number;
    name: string;
    status: string;
};

function MedicationRequests() {
    const [requests, setRequests] = useState<MedicationRequest[]>([]);

    useEffect(() => {
        fetchMedicationRequests().then(setRequests);
    }, []);

    return (
        <Card>
            <CardContent>
                <h2 className="text-lg font-semibold mb-4">Medication Requests</h2>
                <ul className="space-y-2">
                    {requests.map((req) => (
                        <li key={req.id} className="border rounded p-2 flex justify-between">
                            <span>{req.name}</span>
                            <span className="text-sm text-gray-500">{req.status}</span>
                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card>
    );
}

type InventoryItem = {
    name: string;
    stock: number;
};

function InventoryStatus() {
    const [inventory, setInventory] = useState<InventoryItem[]>([]);

    useEffect(() => {
        fetchInventoryStatus().then(setInventory);
    }, []);

    return (
        <Card>
            <CardContent>
                <h2 className="text-lg font-semibold mb-4">Inventory Status</h2>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={inventory}>
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="stock" fill="#2563EB" />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}

type DispensationHistoryEntry = {
    date: string;
    medication: string;
    patient: string;
};

function DispensationHistory() {
    const [history, setHistory] = useState<DispensationHistoryEntry[]>([]);

    useEffect(() => {
        fetchDispensationHistory().then(setHistory);
    }, []);

    return (
        <Card>
            <CardContent>
                <h2 className="text-lg font-semibold mb-4">Dispensation History</h2>
                <ul className="space-y-2">
                    {history.map((entry, idx) => (
                        <li key={idx} className="border rounded p-2">
                            <div className="text-sm text-gray-700">{entry.date}</div>
                            <div className="font-medium">{entry.medication} to {entry.patient}</div>
                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card>
    );
}

type StockRefillEntry = {
    date: string;
    medication: string;
    quantity: number;
};

function StockRefill() {
    const [refills, setRefills] = useState<StockRefillEntry[]>([]);

    useEffect(() => {
        fetchStockRefill().then(setRefills);
    }, []);

    return (
        <Card>
            <CardContent>
                <h2 className="text-lg font-semibold mb-4">Stock Refill Logs</h2>
                <ul className="space-y-2">
                    {refills.map((entry, idx) => (
                        <li key={idx} className="border rounded p-2">
                            <div className="text-sm text-gray-700">{entry.date}</div>
                            <div className="font-medium">{entry.medication}: {entry.quantity} units</div>
                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card>
    );
}

type InteractionWarning = {
    id: number;
    message: string;
};

function InteractionWarnings() {
    const [warnings, setWarnings] = useState<InteractionWarning[]>([]);

    useEffect(() => {
        fetchInteractionWarnings().then(setWarnings);
    }, []);

    return (
        <Card>
            <CardContent>
                <h2 className="text-lg font-semibold mb-4">Drug Interaction Warnings</h2>
                <ul className="space-y-2">
                    {warnings.map((warn) => (
                        <li key={warn.id} className="border-l-4 border-red-500 bg-red-50 p-3">
                            <span className="text-red-800 text-sm">{warn.message}</span>
                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card>
    );
}

export default function PharmacistTabs() {
    return (
        <Tabs defaultValue="requests" className="w-full space-y-4">
            <TabsList className="grid grid-cols-5 w-full">
                <TabsTrigger value="requests">Medication Requests</TabsTrigger>
                <TabsTrigger value="inventory">Inventory Status</TabsTrigger>
                <TabsTrigger value="dispensation">Dispensation History</TabsTrigger>
                <TabsTrigger value="refill">Stock Refill Logs</TabsTrigger>
                <TabsTrigger value="warnings">Interaction Warnings</TabsTrigger>
            </TabsList>

            <TabsContent value="requests"><MedicationRequests /></TabsContent>
            <TabsContent value="inventory"><InventoryStatus /></TabsContent>
            <TabsContent value="dispensation"><DispensationHistory /></TabsContent>
            <TabsContent value="refill"><StockRefill /></TabsContent>
            <TabsContent value="warnings"><InteractionWarnings /></TabsContent>
        </Tabs>
    );
}
