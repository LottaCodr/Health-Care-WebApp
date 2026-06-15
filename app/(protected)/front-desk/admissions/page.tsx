"use client"

import AdmissionsQueue from "@/components/front-desk/AdmissionsQueue";
import { useAuth } from "@/context/auth-provider";

export default function AdmissionQueuePage() {
    const { user } = useAuth();
    const staffId = user?.id ?? "";

    return (
        <AdmissionsQueue staffId={staffId} />
    );
}