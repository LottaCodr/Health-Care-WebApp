"use client";

import React from "react";
import { PatientStatus } from "@/types/models";
import { Badge } from "@/components/ui/badge";

const statusStyles: Record<PatientStatus, string> = {
    [PatientStatus.Registered]: "bg-blue-100 text-blue-800 border-blue-200",
    [PatientStatus.AwaitingConsultation]: "bg-yellow-100 text-yellow-800 border-yellow-200",
    [PatientStatus.UnderConsultation]: "bg-purple-100 text-purple-800 border-purple-200",
    [PatientStatus.SentToNurse]: "bg-green-100 text-green-800 border-green-200",
    [PatientStatus.SentToLab]: "bg-orange-100 text-orange-800 border-orange-200",
    [PatientStatus.SentToPharmacy]: "bg-indigo-100 text-indigo-800 border-indigo-200",
    [PatientStatus.AwaitingPayment]: "bg-red-100 text-red-800 border-red-200",
    [PatientStatus.Discharged]: "bg-gray-100 text-gray-800 border-gray-200",
    [PatientStatus.Cancelled]: "bg-rose-100 text-rose-800 border-rose-200",
    [PatientStatus.AwaitingDoctorReview]: "bg-cyan-100 text-cyan-800 border-cyan-200",
    [PatientStatus.AwaitingNextStep]: "bg-teal-100 text-teal-800 border-teal-200",
};

export function StatusBadge({ status }: { status: PatientStatus }) {
    return (
        <Badge className={`${statusStyles[status] || "bg-gray-100 text-gray-800"} px-3 py-1 rounded-full font-bold uppercase tracking-wider text-[10px] shadow-sm`}>
            {status}
        </Badge>
    );
}
