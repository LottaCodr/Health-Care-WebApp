"use client";

import React, { useState } from "react";
import { MdInfoOutline, MdRefresh, MdNavigateBefore, MdNavigateNext } from "react-icons/md";
import { useQuery } from "@tanstack/react-query";
import { getAllPatients } from "@/actions/front-desk/get.patients";
import { Patient } from "@/context/patients/types";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const ITEMS_PER_PAGE = 10;

function getInitials(name: string) {
    if (!name) return "";
    return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase();
}

export default function AdmittedPatientsTableSection() {
    const {
        data: allPatients,
        isPending,
        isError,
        refetch,
    } = useQuery({
        queryKey: ["patients"],
        queryFn: getAllPatients,
    });

    const admittedPatients: Patient[] =
        allPatients?.filter((p: Patient) => p.status === "admitted") || [];

    const [page, setPage] = useState(1);
    const totalPages = Math.max(1, Math.ceil(admittedPatients.length / ITEMS_PER_PAGE));

    const paginatedPatients = admittedPatients.slice(
        (page - 1) * ITEMS_PER_PAGE,
        page * ITEMS_PER_PAGE
    );

    return (
        <section
            role="region"
            aria-label="Currently Admitted Patients"
            className="rounded-2xl border border-red-200 bg-white p-4 sm:p-6 shadow-lg flex flex-col gap-6"
        >
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                    <span className="inline-flex items-center justify-center rounded-full bg-red-100 p-2">
                        <MdInfoOutline className="text-red-600 text-2xl" />
                    </span>
                    <div>
                        <h2 className="text-2xl font-bold text-red-700 tracking-tight">
                            Admitted Patients
                        </h2>
                        <p className="text-sm text-gray-500">
                            List of patients currently admitted to the hospital.
                        </p>
                    </div>
                </div>
                <Button
                    variant="outline"
                    size="icon"
                    aria-label="Refresh"
                    className="border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400"
                    onClick={() => refetch()}
                >
                    <MdRefresh className="w-5 h-5" />
                </Button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-red-100 bg-red-50/30">
                <table className="min-w-full text-sm">
                    <thead>
                        <tr className="bg-red-100 text-red-700 font-semibold">
                            <th className="px-4 py-3 text-left">Patient</th>
                            <th className="px-4 py-3 text-left">Email</th>
                            <th className="px-4 py-3 text-left">Gender</th>
                            <th className="px-4 py-3 text-left">Allergies</th>
                            <th className="px-4 py-3 text-left">Current Medication</th>
                            <th className="px-4 py-3 text-left">Admitted On</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isPending ? (
                            <tr>
                                <td colSpan={6} className="text-center py-8 text-red-400 animate-pulse">
                                    Loading admitted patients...
                                </td>
                            </tr>
                        ) : isError ? (
                            <tr>
                                <td colSpan={6} className="text-center py-8 text-red-600 font-semibold">
                                    Failed to load patient data.
                                    <div className="mt-2">
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            onClick={() => refetch()}
                                            className="mt-1"
                                        >
                                            Retry
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        ) : paginatedPatients.length > 0 ? (
                            paginatedPatients.map((patient) => (
                                <tr
                                    key={patient.userId}
                                    className="border-t border-red-100 hover:bg-red-50/60 transition"
                                >
                                    <td className="px-4 py-3 flex items-center gap-3 font-medium text-gray-900">
                                        <Avatar className="h-9 w-9 border border-red-200 shadow-sm">
                                            <AvatarImage
                                                src=""
                                                alt={patient.name}
                                            />
                                            <AvatarFallback className="bg-red-200 text-red-700 font-bold">
                                                {getInitials(patient.name)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <span>{patient.name}</span>
                                    </td>
                                    <td className="px-4 py-3 text-gray-700">{patient.email}</td>
                                    <td className="px-4 py-3 capitalize text-gray-700">{patient.gender}</td>
                                    <td className="px-4 py-3 text-gray-700">
                                        {patient.allergies || <span className="italic text-gray-400">None</span>}
                                    </td>
                                    <td className="px-4 py-3 text-gray-700">
                                        {patient.currentMedication || <span className="italic text-gray-400">None</span>}
                                    </td>
                                    <td className="px-4 py-3 text-gray-700">
                                        {patient.$createdAt
                                            ? new Date(patient.$createdAt).toLocaleDateString(undefined, {
                                                year: "numeric",
                                                month: "short",
                                                day: "numeric",
                                            })
                                            : <span className="italic text-gray-400">Unknown</span>
                                        }
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={6} className="text-center py-8 text-gray-400">
                                    No admitted patients at the moment.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-center pt-4 gap-3">
                <span className="text-sm text-gray-500">
                    Showing {paginatedPatients.length} of {admittedPatients.length} admitted patient{admittedPatients.length !== 1 ? "s" : ""}
                </span>
                {admittedPatients.length > ITEMS_PER_PAGE && (
                    <div className="flex items-center gap-2">
                        <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setPage((p) => Math.max(p - 1, 1))}
                            disabled={page === 1}
                            className={`border border-red-200 ${page === 1 ? "opacity-50" : "hover:bg-red-100"}`}
                            aria-label="Previous page"
                        >
                            <MdNavigateBefore className="w-5 h-5 text-red-600" />
                        </Button>
                        <span className="text-sm text-red-700 font-semibold">
                            Page {page} of {totalPages}
                        </span>
                        <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                            disabled={page === totalPages}
                            className={`border border-red-200 ${page === totalPages ? "opacity-50" : "hover:bg-red-100"}`}
                            aria-label="Next page"
                        >
                            <MdNavigateNext className="w-5 h-5 text-red-600" />
                        </Button>
                    </div>
                )}
            </div>
        </section>
    );
}
