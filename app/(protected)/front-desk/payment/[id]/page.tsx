"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function PatientPaymentRedirectPage() {
    const params = useParams();
    const router = useRouter();
    const id = (params?.id ?? params?.userId) as string;

    useEffect(() => {
        if (id) {
            router.replace(`/front-desk/patient/${id}`);
        } else {
            router.replace("/front-desk/payment");
        }
    }, [id, router]);

    return (
        <div className="min-h-[300px] flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            <p className="text-sm font-semibold text-gray-500">Opening patient billing…</p>
        </div>
    );
}
