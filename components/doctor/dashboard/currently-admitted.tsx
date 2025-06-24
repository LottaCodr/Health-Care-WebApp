"use client";

import React, { useState } from "react";
import { MdInfoOutline } from "react-icons/md";
import { useQuery } from "@tanstack/react-query";
import { getAllPatients } from "@/actions/patients/get.patients";
import { Patient } from "@/context/patients/types";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const ITEMS_PER_PAGE = 10;

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
    const totalPages = Math.ceil(admittedPatients.length / ITEMS_PER_PAGE);

    const paginatedPatients = admittedPatients.slice(
        (page - 1) * ITEMS_PER_PAGE,
        page * ITEMS_PER_PAGE
    );

    return (
        <section
            role="region"
            aria-label="Currently Admitted Patients"
            className="rounded-2xl border border-border bg-muted/40 p-4 sm:p-6 shadow-sm flex flex-col gap-6"
        >
            <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                    <MdInfoOutline className="text-muted-foreground text-xl mt-1" />
                    <div>
                        <h2 className="text-xl font-semibold text-foreground">
                            Admitted Patients
                        </h2>
                        <p className="text-sm text-muted-foreground text-balance">
                            This table shows patients who are currently admitted.
                        </p>
                    </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => refetch()}>
                    Refresh
                </Button>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full border text-sm">
                    <thead className="bg-muted text-foreground font-medium">
                        <tr>
                            <th className="px-4 py-2 text-left">Patient</th>
                            <th className="px-4 py-2 text-left">Email</th>
                            <th className="px-4 py-2 text-left">Gender</th>
                            <th className="px-4 py-2 text-left">Allergies</th>
                            <th className="px-4 py-2 text-left">Current Medication</th>
                            <th className="px-4 py-2 text-left">Admitted On</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isPending ? (
                            <tr>
                                <td colSpan={6} className="text-center py-6 text-muted-foreground">
                                    Loading admitted patients...
                                </td>
                            </tr>
                        ) : isError ? (
                            <tr>
                                <td colSpan={6} className="text-center py-6 text-red-500">
                                    Failed to load patient data.
                                </td>
                            </tr>
                        ) : paginatedPatients.length > 0 ? (
                            paginatedPatients.map((patient) => (
                                <tr key={patient.userId} className="border-t">
                                    <td className="px-4 py-2 flex items-center gap-3">
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage
                                                src={""}
                                                alt={patient.name}
                                            />
                                            <AvatarFallback>
                                                {patient.name
                                                    ?.split(" ")
                                                    .map((n) => n[0])
                                                    .join("")}
                                            </AvatarFallback>
                                        </Avatar>
                                        {patient.name}
                                    </td>
                                    <td className="px-4 py-2">{patient.email}</td>
                                    <td className="px-4 py-2 capitalize">{patient.gender}</td>
                                    <td className="px-4 py-2">{patient.allergies}</td>
                                    <td className="px-4 py-2">{patient.currentMedication}</td>
                                    <td className="px-4 py-2">
                                        {new Date(patient.birthDate).toLocaleDateString(undefined, {
                                            year: "numeric",
                                            month: "short",
                                            day: "numeric",
                                        })}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={6} className="text-center py-6 text-muted-foreground">
                                    No admitted patients at the moment.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {admittedPatients.length > ITEMS_PER_PAGE && (
                <div className="flex justify-between items-center pt-4">
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setPage((p) => Math.max(p - 1, 1))}
                        disabled={page === 1}
                    >
                        Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">
                        Page {page} of {totalPages}
                    </span>
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                        disabled={page === totalPages}
                    >
                        Next
                    </Button>
                </div>
            )}
        </section>
    );
}
