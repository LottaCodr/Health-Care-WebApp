"use client";

import React from "react";
import { CheckCircle2, X } from "lucide-react";

export function SuccessAlert({ message, onDismiss }: { message: string; onDismiss?: () => void }) {
    return (
        <div className="rounded-[2rem] bg-emerald-50 border border-emerald-100 p-6 mb-8 relative overflow-hidden shadow-sm">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500" />
            <div className="flex items-start gap-4">
                <div className="p-3 bg-emerald-100 rounded-2xl text-emerald-600">
                    <CheckCircle2 size={24} />
                </div>
                <div className="flex-1">
                    <h3 className="text-lg font-black text-emerald-900 tracking-tight">Operation Successful</h3>
                    <p className="text-sm font-bold text-emerald-700/80 mt-1 leading-relaxed">{message}</p>
                </div>
                {onDismiss && (
                    <button onClick={onDismiss} className="p-2 hover:bg-emerald-100 rounded-xl transition-colors text-emerald-400 hover:text-emerald-700">
                        <X size={20} />
                    </button>
                )}
            </div>
        </div>
    );
}
