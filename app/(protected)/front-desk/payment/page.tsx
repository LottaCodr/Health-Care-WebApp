"use client";

import PaymentSuite from "@/components/front-desk/PaymentSuite";
import PaymentHistoryPanel from "@/components/front-desk/PaymentHistoryPanel";
import RecentPaymentsPanel from "@/components/front-desk/RecentPaymentsPanel";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Wallet, History, Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import { usePendingPayments } from "@/hooks/emr/use-payment";

export default function PaymentPage() {
    const router = useRouter();
    const pending = usePendingPayments();
    const pendingCount = Array.isArray(pending.data) ? pending.data.length : 0;

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
                        {pendingCount > 0 && (
                            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-100 px-1.5 text-[10px] font-black text-amber-700">
                                {pendingCount}
                            </span>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="history" className="rounded-xl text-sm font-semibold gap-2">
                        <History size={14} /> Patient History
                    </TabsTrigger>
                    <TabsTrigger value="recent" className="rounded-xl text-sm font-semibold gap-2">
                        <Clock size={14} /> Recent Activity
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="checkout" className="mt-0">
                    <PaymentSuite />
                </TabsContent>

                <TabsContent value="history" className="mt-0">
                    <PaymentHistoryPanel />
                </TabsContent>

                <TabsContent value="recent" className="mt-0">
                    <RecentPaymentsPanel />
                </TabsContent>
            </Tabs>
        </div>
    );
}
