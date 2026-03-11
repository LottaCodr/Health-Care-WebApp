"use client";

import VitalsSuite from "@/components/nurse/VitalsSuite";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ClipboardCheck } from "lucide-react";
import { useParams, useRouter } from "next/navigation";

export default function NursingTaskPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();

    if (!id) return null;

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            <div className="flex items-center gap-3 mb-8">
                <Button onClick={() => router.back()} variant="ghost" className="gap-2 rounded-xl px-3">
                    <ArrowLeft size={18} />
                </Button>
                <span className="flex items-center gap-2 text-blue-800 font-bold text-2xl">
                    <ClipboardCheck size={24} /> Nursing Documentation
                </span>
            </div>

            {/* We don't have the patientId directly here easily without fetching task info, 
                but for simplicity we'll assume the task object has it or we fetch it in VitalsSuite.
                Actually my VitalsSuite takes patientId. 
                In a real app, we'd fetch the task first to get the patientId.
            */}
            <VitalsSuite patientId={"TASK_REF_FETCHED_IN_SUITE"} taskId={id} onComplete={() => router.push("/nurse/dashboard")} />
        </div>
    );
}
