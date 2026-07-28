"use client";

import React from "react";
import { Payment } from "@/types/models";
import { Badge } from "@/components/ui/badge";
import { Wallet, CreditCard, Clock, CheckCircle2, AlertCircle } from "lucide-react";

export function PaymentCard({ payment }: { payment: Payment }) {
    const getStatusConfig = (status: string) => {
        switch (status) {
            case "Completed":
                return { color: "bg-green-100 text-green-700 border-green-200", icon: <CheckCircle2 size={12} /> };
            case "Pending":
                return { color: "bg-yellow-100 text-yellow-700 border-yellow-200", icon: <Clock size={12} /> };
            case "Failed":
                return { color: "bg-red-100 text-red-700 border-red-200", icon: <AlertCircle size={12} /> };
            default:
                return { color: "bg-gray-100 text-gray-700 border-gray-200", icon: null };
        }
    };

    const config = getStatusConfig(payment.status);

    return (
        <div className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm flex flex-col justify-between h-full">
            <div className="flex justify-between items-start mb-6">
                <div className="flex gap-3 items-center">
                    <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center text-green-600">
                        <Wallet size={24} />
                    </div>
                    <div>
                        <h4 className="text-2xl font-black text-gray-900 tracking-tighter">
                            ₦{payment.amount.toLocaleString()}
                        </h4>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Transaction Total</p>
                    </div>
                </div>
                <Badge className={`${config.color} rounded-full px-3 py-1 flex gap-1 items-center font-bold text-[10px] uppercase tracking-wider shadow-sm`}>
                    {config.icon}
                    {payment.status}
                </Badge>
            </div>

            <div className="space-y-4">
                <div className="flex items-center justify-between text-sm py-2 border-b border-gray-50">
                    <span className="flex items-center gap-2 text-gray-400 font-bold uppercase text-[10px] tracking-widest">
                        <CreditCard size={12} /> Provider/Method
                    </span>
                    <span className="font-bold text-gray-800">{payment.paymentMethod}</span>
                </div>

                <div className="space-y-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Service Description</p>
                    <p className="text-sm font-medium text-gray-700 italic">&quot;{payment.description}&quot;</p>
                </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-50 flex justify-between items-center bg-gray-50 -mx-6 -mb-6 p-6 rounded-b-[2rem]">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Processed On</span>
                <span className="text-xs font-bold text-gray-600">{payment.processedDate ? new Date(payment.processedDate).toLocaleDateString() : "—"}</span>
            </div>
        </div>
    );
}
