"use client";

import React from "react";
import { Hammer, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function ComingSoon({ title = "Feature Coming Soon", description = "We're working hard to bring this feature to your workspace. Stay tuned!" }: { title?: string; description?: string }) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
            <div className="w-16 h-16 rounded-3xl bg-amber-50 border border-amber-100 flex items-center justify-center mb-6">
                <Hammer size={32} className="text-amber-600 animate-bounce" />
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-2">{title}</h2>
            <p className="text-gray-500 text-center max-w-sm mb-8">
                {description}
            </p>
            <Link href="/doctor/dashboard"
                className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#0a1628] hover:bg-[#0f1f38] text-white text-sm font-bold transition-all shadow-lg shadow-slate-900/10"
            >
                <ArrowLeft size={16} /> Back to Dashboard
            </Link>
        </div>
    );
}
