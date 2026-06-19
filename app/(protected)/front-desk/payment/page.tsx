"use client";

import PaymentSuite from "@/components/front-desk/PaymentSuite";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Wallet, History } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    usePendingPayments,
    usePaymentsByPatient,
    useCreatePayment,
    useConfirmPayment
} from "@/hooks/emr/use-payment";

export default function PaymentPage() {
    const router = useRouter();

    // Use payment hooks
    const pendingPaymentsQuery = usePendingPayments();
    // NOTE: Assuming patientId is available for demonstration; in this file, use as needed.
    // const paymentsByPatientQuery = usePaymentsByPatient(patientId);
    // (createPaymentMutation and confirmPaymentMutation are left in case needed for other tabs)

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

            <Tabs defaultValue="checkout" className="space-y-6">
                <TabsList className="bg-white border border-gray-100 rounded-2xl p-1">
                    <TabsTrigger value="checkout" className="rounded-xl text-sm font-semibold gap-2">
                        <Wallet size={14} /> Checkout Queue
                    </TabsTrigger>
                    <TabsTrigger value="history" className="rounded-xl text-sm font-semibold gap-2">
                        <History size={14} /> Patient History
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="checkout" className="mt-0">
                    <PaymentSuite />
                </TabsContent>

                <TabsContent value="history" className="mt-0">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-3">
                        <h3 className="text-sm font-bold text-gray-900">Per-patient payment history</h3>
                        <p className="text-sm text-gray-500">
                            Open a patient from the registry, then use the <strong>Billing</strong> tab on their
                            profile (for patients awaiting payment or discharged).
                        </p>
                        <Link
                            href="/front-desk/patient"
                            className="inline-flex text-sm font-semibold text-blue-600 hover:text-blue-800"
                        >
                            Go to Patient Registry →
                        </Link>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
