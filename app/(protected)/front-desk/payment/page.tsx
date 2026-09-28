"use client";

import PaymentSuite from "@/components/front-desk/PaymentSuite";
import PaymentHistoryPanel from "@/components/front-desk/PaymentHistoryPanel";
import RecentPaymentsPanel from "@/components/front-desk/RecentPaymentsPanel";
import { Button } from "@/components/ui/button";
import {
    Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import { ArrowLeft, Wallet, History, UserSearch } from "lucide-react";
import { useRouter } from "next/navigation";
import { usePendingPayments } from "@/hooks/emr/use-payment";

export default function PaymentPage() {
    const router = useRouter();
    const pending = usePendingPayments();
    const pendingCount = Array.isArray(pending.data) ? pending.data.length : 0;

    return (
        <div className="mx-auto max-w-6xl px-4 py-8">
            <div className="mb-8 flex items-center gap-3">
                <Button onClick={() => router.back()} variant="ghost" className="gap-2 rounded-xl px-3">
                    <ArrowLeft size={18} />
                </Button>
                <span className="flex items-center gap-2 text-2xl font-bold text-blue-800">
                    <Wallet size={24} /> Billing & Checkout
                </span>
            </div>

            <Tabs defaultValue="checkout" className="space-y-6">
                <TabsList className="rounded-2xl border border-gray-100 bg-white p-1">
                    <TabsTrigger value="checkout" className="gap-2 rounded-xl text-sm font-semibold">
                        <Wallet size={14} /> Checkout Queue
                        {pendingCount > 0 && (
                            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-100 px-1.5 text-[10px] font-black text-amber-700">
                                {pendingCount}
                            </span>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="history" className="gap-2 rounded-xl text-sm font-semibold">
                        <UserSearch size={14} /> Patient History
                    </TabsTrigger>
                    <TabsTrigger value="recent" className="gap-2 rounded-xl text-sm font-semibold">
                        <History size={14} /> Recent Activity
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
