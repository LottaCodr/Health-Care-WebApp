"use client";

import PharmacySuite from "@/components/pharmacist/PharmacySuite";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Pill } from "lucide-react";
import { useParams, useRouter } from "next/navigation";

export default function DispensePage() {
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
                    <Pill size={24} /> Medication Fulfillment
                </span>
            </div>

            <PharmacySuite prescriptionId={id} onComplete={() => router.push("/pharmacist/dashboard")} />
        </div>
    );
}
