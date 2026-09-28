"use client";

import React from "react";
import { AlertCircle, X } from "lucide-react";

export function ErrorAlert({ error, message, onDismiss }: { error?: Error; message?: string; onDismiss?: () => void }) {
    const displayMessage = message || (error ? error.message : "A critical system error occurred.");

    return (
        <div className="rounded-[2rem] bg-red-50 border border-red-100 p-6 mb-8 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-red-500" />
            <div className="flex items-start gap-4">
                <div className="p-3 bg-red-100 rounded-2xl text-red-600">
                    <AlertCircle size={24} />
                </div>
                <div className="flex-1">
                    <h3 className="text-lg font-black text-red-900 tracking-tight">Operation Failed</h3>
                    <p className="text-sm font-bold text-red-700/80 mt-1 leading-relaxed">{displayMessage}</p>
                </div>
                {onDismiss && (
                    <button onClick={onDismiss} className="p-2 hover:bg-red-100 rounded-xl transition-colors text-red-400 hover:text-red-700">
                        <X size={20} />
                    </button>
                )}
            </div>
        </div>
    );
}
