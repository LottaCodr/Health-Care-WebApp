"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useSearchPatients } from "@/hooks/emr/use-patients";
import { Search, X, ChevronRight, Loader2, User } from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcAge(dob?: string): string | null {
    if (!dob) return null;
    const y = new Date().getFullYear() - new Date(dob).getFullYear();
    return y < 1 ? "< 1 yr" : `${y} yrs`;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface NursePatientSearchProps {
    /** Where clicking a result should navigate to — defaults to the patient detail tab. */
    basePath?: string;
}

export default function NursePatientSearch({ basePath = "/nurse/patient" }: NursePatientSearchProps) {
    const [query, setQuery] = useState("");
    const { data: results = [], isLoading } = useSearchPatients(query);

    const showDropdown = query.trim().length > 0;

    return (
        <div className="relative">
            <div className="relative">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Search any patient by name or phone — not just your queue…"
                    className="w-full h-11 pl-10 pr-9 rounded-2xl border border-gray-200 bg-white text-sm placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-400/25 focus:border-teal-400 transition-all shadow-sm"
                />
                {query && (
                    <button onClick={() => setQuery("")}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        <X size={14} />
                    </button>
                )}
            </div>

            {showDropdown && (
                <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-gray-100 shadow-xl overflow-hidden max-h-80 overflow-y-auto">
                    {isLoading ? (
                        <div className="flex items-center gap-2 px-4 py-5 justify-center">
                            <Loader2 size={14} className="text-teal-500 animate-spin" />
                            <p className="text-sm text-gray-400">Searching…</p>
                        </div>
                    ) : results.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 gap-2">
                            <User size={18} className="text-gray-300" />
                            <p className="text-sm font-semibold text-gray-500">No patients found</p>
                            <p className="text-xs text-gray-400">Try a different name or phone number</p>
                        </div>
                    ) : (
                        (results as any[]).map(p => {
                            const age      = calcAge(p.birth_date ?? p.date_of_birth);
                            const isFemale = (p.gender ?? "").toLowerCase() === "female";
                            return (
                                <Link key={p.id} href={`${basePath}/${p.id}`}
                                    className="flex items-center gap-3 px-4 py-3 hover:bg-teal-50 transition-colors border-b border-gray-50 last:border-0">
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 border ${
                                        isFemale ? "bg-pink-50 border-pink-100 text-pink-600" : "bg-teal-50 border-teal-100 text-teal-600"
                                    }`}>
                                        {(p.name ?? "?")[0].toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-gray-900 truncate">{p.name}</p>
                                        <div className="flex items-center gap-2 text-[11px] text-gray-400">
                                            {p.gender && <span>{p.gender}</span>}
                                            {age && <span>· {age}</span>}
                                            {p.phone && <span>· {p.phone}</span>}
                                        </div>
                                    </div>
                                    {p.status && (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 shrink-0 capitalize">
                                            {String(p.status).replace(/-/g, " ")}
                                        </span>
                                    )}
                                    <ChevronRight size={14} className="text-gray-300 shrink-0" />
                                </Link>
                            );
                        })
                    )}
                </div>
            )}
        </div>
    );
}