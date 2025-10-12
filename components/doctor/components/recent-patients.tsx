"use client";

import React, { useEffect, useState } from "react";
import { FileText, History, ArrowRight } from "lucide-react";
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
    CardFooter,
} from "@/components/ui/card";
import { getAllPatients } from "@/actions/patients/patients";
import { Patient } from "@/context/patients/types";



export default function RecentPatients() {
    const [patients, setPatients] = useState<Patient[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchPatients() {
            try {
                const data = await getAllPatients();
                console.log('patients: ', data)
                setPatients(data || []);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        fetchPatients();
    }, []);

    return (
        <Card className="flex flex-col h-full min-w-[340px] max-w-1/2">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                    <CardTitle className="text-lg font-semibold text-black">
                        Today's Patients
                    </CardTitle>
                    <CardDescription className="text-xs text-gray-400 mt-1">
                        Patients you're seeing today
                    </CardDescription>
                </div>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col p-0">
                {loading ? (
                    <div className="p-4 text-sm text-gray-400">Loading patients...</div>
                ) : patients.length === 0 ? (
                    <div className="p-4 text-sm text-gray-400">No patients yet.</div>
                ) : (
                    <ul className="flex-1 space-y-2 overflow-y-auto pr-1 px-2">
                        {patients.map((patient) => {
                            const initials =
                                (patient.name?.[0] || "") + (patient.name?.[0] || "");
                            return (
                                <li
                                    key={patient.$id}
                                    className="flex items-center justify-between rounded px-3 py-2 border-l-4 border-gray-700"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-lg text-white font-bold">
                                            {initials}
                                        </span>
                                        <div>
                                            <div className="text-sm text-black font-medium">
                                                {patient.name}
                                            </div>
                                            <div className="text-xs text-gray-400">
                                                {patient.gender || "Unknown"} • {patient.status || "N/A"}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-1 items-end min-w-[90px]">
                                        <button
                                            className="text-xs text-gray-300 bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded mb-1 flex items-center gap-1"
                                            title="View History"
                                        >
                                            <History size={14} />
                                            <span className="hidden sm:inline">History</span>
                                        </button>
                                        <button
                                            className="text-xs text-white bg-primary hover:bg-red-700 px-2 py-1 rounded flex items-center gap-1"
                                            title="Examine"
                                        >
                                            <FileText size={14} />
                                            <span className="hidden sm:inline">Examine</span>
                                        </button>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </CardContent>

            <CardFooter className="pt-2">
                <button
                    onClick={() => {
                        console.log("Navigate to all patients page");
                    }}
                    className="w-full text-xs text-gray-400 hover:text-primary transition py-1 rounded flex items-center justify-center gap-1"
                >
                    <ArrowRight size={14} />
                    <span>See all patients</span>
                </button>
            </CardFooter>
        </Card>
    );
}
