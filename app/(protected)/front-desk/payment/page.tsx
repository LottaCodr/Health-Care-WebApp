"use client";

import PaymentSuite from "@/components/front-desk/PaymentSuite";
import PaymentHistoryPanel from "@/components/front-desk/PaymentHistoryPanel";
import RecentPaymentsPanel from "@/components/front-desk/RecentPaymentsPanel";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Wallet, History, UserSearch } from "lucide-react";
import { useRouter } from "next/navigation";
import { usePendingPayments } from "@/hooks/emr/use-payment";

export default function PaymentPage() {
    const router = useRouter();
    const pending = usePendingPayments();
    const pendingCount = Array.isArray(pending.data) ? pending.data.length : 0;

    return (
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
            <div className="mb-6 flex items-center gap-3 sm:mb-8">
                <Button type="button" onClick={() => router.back()} variant="outline" size="icon" aria-label="Go back" className="shrink-0 rounded-xl">
                    <ArrowLeft size={18} aria-hidden="true" />
                </Button>
                <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900 sm:text-2xl">
                    <Wallet size={24} aria-hidden="true" className="shrink-0 text-blue-700" /> Billing &amp; Checkout
                </h1>
            </div>

            <Tabs defaultValue="checkout" className="space-y-6">
                <div className="max-w-full overflow-x-auto pb-1">
                    <TabsList aria-label="Billing sections" className="h-auto min-w-max rounded-2xl border border-gray-200 bg-white p-1 shadow-sm">
                        <TabsTrigger value="checkout" className="gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 data-[state=active]:text-slate-900">
                            <Wallet size={14} aria-hidden="true" /> Checkout Queue
                            {pendingCount > 0 && (
                                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-100 px-1.5 text-[10px] font-black text-amber-700">
                                    {pendingCount}
                                </span>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="history" className="gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 data-[state=active]:text-slate-900">
                            <UserSearch size={14} aria-hidden="true" /> Patient History
                        </TabsTrigger>
                        <TabsTrigger value="recent" className="gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 data-[state=active]:text-slate-900">
                            <History size={14} aria-hidden="true" /> Recent Activity
                        </TabsTrigger>
                    </TabsList>
                </div>

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
