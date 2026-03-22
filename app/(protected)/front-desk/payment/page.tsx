"use client";

import PaymentConfirmation from "@/components/front-desk/PaymentSuite";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";

export default function PaymentPage() {
    const router = useRouter();

    return (
        <div className="max-w-6xl mx-auto px-4 py-8">
            <div className="flex items-center gap-3 mb-8">
                <Button onClick={() => router.back()} variant="ghost" className="gap-2 rounded-xl px-3">
                    <ArrowLeft size={18} />
                </Button>
                <span className="flex items-center gap-2 text-blue-800 font-bold text-2xl">
                    <Wallet size={24} /> Billing & Checkout
                </span>
            </div>

            <PaymentConfirmation />
        </div>
    );
}
