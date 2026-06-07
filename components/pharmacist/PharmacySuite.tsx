
"use client";

import React from "react";
import { useRoleProtection } from "@/lib/role-utils";
import { UserRole } from "@/types/models";
import { usePendingPrescriptions } from "@/hooks/emr/use-emr";
import { LoadingSkeleton } from "@/components/emr";
import {
    Pill, Clock, CheckCircle2, ChevronRight,
    RefreshCcw, BadgeDollarSign, User, Calendar,
    Stethoscope, AlertCircle, TrendingUp,
} from "lucide-react";
import Link from "next/link";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtNaira = (n?: number) =>
    n !== undefined ? `₦${Number(n).toLocaleString("en-NG", { minimumFractionDigits: 2 })}` : "—";

function timeAgo(iso?: string) {
    if (!iso) return "";
    const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (mins < 1)  return "just now";
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ago`;
}

function fmtDate(iso?: string) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function PharmacistDashboard() {
    const { authorized } = useRoleProtection([UserRole.Pharmacist, UserRole.Admin]);
    const { data: prescriptions, isLoading: loading, refetch } = usePendingPrescriptions();

    if (!authorized) return null;

    const active      = (prescriptions as any[] ?? []).filter(p => p.status === "Active" || !p.dispensed);
    const dispensed   = (prescriptions as any[] ?? []).filter(p => p.status === "Dispensed" || p.dispensed === true);
    const unreviewed  = active.filter(p => !p.pharmacist_id);
    const totalPending= active.reduce((s: number, p: any) => s + (Number(p.price) || 0), 0);
    const totalEarned = dispensed.reduce((s: number, p: any) => s + (Number(p.price) || 0), 0);

    const stats = [
        { label: "Active Orders",    value: active.length,     icon: Pill,          color: "text-violet-600", bg: "bg-violet-50", border: "border-violet-100" },
        { label: "Unreviewed",       value: unreviewed.length, icon: Clock,         color: "text-amber-600",  bg: "bg-amber-50",  border: "border-amber-100"  },
        { label: "Dispensed Today",  value: dispensed.length,  icon: CheckCircle2,  color: "text-green-600",  bg: "bg-green-50",  border: "border-green-100"  },
        { label: "Revenue Today",    value: null,              icon: TrendingUp,    color: "text-blue-600",   bg: "bg-blue-50",   border: "border-blue-100",
          custom: totalEarned > 0 ? fmtNaira(totalEarned) : "₦0.00"
        },
    ];

    return (
        <div className="space-y-6">

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map(s => {
                    const Icon = s.icon;
                    return (
                        <div key={s.label} className={`bg-white rounded-2xl border ${s.border} shadow-sm px-5 py-5 flex items-center gap-4 hover:shadow-md transition-shadow`}>
                            <div className={`w-11 h-11 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
                                <Icon size={19} className={s.color} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xl font-extrabold text-gray-900 leading-none truncate">
                                    {s.custom ?? s.value}
                                </p>
                                <p className="text-xs text-gray-400 font-medium mt-1">{s.label}</p>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Dispensing queue */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-50">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
                            <Pill size={16} className="text-violet-600" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-gray-800">Dispensing Queue</h2>
                            <p className="text-xs text-gray-400 mt-0.5">Active prescriptions awaiting dispensing</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {active.length > 0 && totalPending > 0 && (
                            <span className="hidden sm:flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-violet-50 text-violet-700 border border-violet-100">
                                <BadgeDollarSign size={11} /> {fmtNaira(totalPending)}
                            </span>
                        )}
                        {active.length > 0 && (
                            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
                                {active.length} pending
                            </span>
                        )}
                        <button onClick={() => refetch()}
                            className="w-8 h-8 rounded-xl border border-gray-200 bg-white flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors">
                            <RefreshCcw size={13} />
                        </button>
                    </div>
                </div>

                <div className="px-6 py-5 space-y-3">
                    {loading ? <LoadingSkeleton rows={4} /> : active.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-green-50 border border-green-100 flex items-center justify-center">
                                <CheckCircle2 size={22} className="text-green-500" />
                            </div>
                            <p className="text-sm font-semibold text-gray-600">Queue Empty</p>
                            <p className="text-xs text-gray-400">No active prescriptions to dispense</p>
                        </div>
                    ) : (
                        active.map((order: any, idx: number) => {
                            const patientName     = order.patients?.name ?? `Patient #${order.patient_id?.slice(-6) ?? "—"}`;
                            const prescribedByName= order.staffs?.name ?? order.doctor_name ?? null;
                            const isUnreviewed    = !order.pharmacist_id;
                            const price           = Number(order.price) || 0;
                            const ago             = timeAgo(order.created_at);

                            return (
                                <Link key={order.id} href={`/pharmacist/queue/patient/${order.patient_id}`}
                                    className="group block rounded-2xl border border-gray-100 bg-gray-50/50 hover:bg-white hover:border-violet-100 hover:shadow-sm transition-all overflow-hidden">
                                    <div className="flex items-start gap-3 p-4">
                                        <div className="w-7 h-7 rounded-full bg-gray-100 text-gray-500 group-hover:bg-violet-600 group-hover:text-white flex items-center justify-center text-xs font-black shrink-0 mt-0.5 transition-colors">
                                            {idx + 1}
                                        </div>
                                        <div className="w-9 h-9 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center font-black text-violet-600 text-sm shrink-0">
                                            {(patientName)[0].toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0 space-y-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="text-sm font-bold text-gray-900 truncate">{patientName}</p>
                                                {isUnreviewed && (
                                                    <span className="shrink-0 flex items-center gap-1 text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-100">
                                                        <AlertCircle size={9} /> New
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3 text-[11px] text-gray-500 flex-wrap">
                                                <span className="flex items-center gap-1 font-medium text-gray-700">
                                                    <Stethoscope size={10} /> {order.drug_name ?? "—"}
                                                </span>
                                                {order.dosage && <span>{order.dosage}</span>}
                                                {order.duration && <span>· {order.duration}</span>}
                                            </div>
                                            <div className="flex items-center gap-3 text-[10px] text-gray-400 flex-wrap">
                                                {prescribedByName && <span>Prescribed by Dr. {prescribedByName}</span>}
                                                {ago && <span>· {ago}</span>}
                                            </div>
                                        </div>
                                        <div className="shrink-0 text-right">
                                            {price > 0 && (
                                                <p className="text-sm font-extrabold text-green-600">{fmtNaira(price)}</p>
                                            )}
                                            <ChevronRight size={15} className="text-gray-300 group-hover:text-violet-500 ml-auto mt-1 transition-colors" />
                                        </div>
                                    </div>
                                </Link>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Dispensed today */}
            {dispensed.length > 0 && (
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-5 border-b border-gray-50">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
                                <CheckCircle2 size={15} className="text-green-600" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-gray-800">Dispensed Today</p>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    {dispensed.length} prescription{dispensed.length !== 1 ? "s" : ""} completed
                                </p>
                            </div>
                        </div>
                        {totalEarned > 0 && (
                            <span className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-green-50 text-green-700 border border-green-100">
                                <BadgeDollarSign size={11} /> {fmtNaira(totalEarned)}
                            </span>
                        )}
                    </div>
                    <div className="px-6 py-4 space-y-2">
                        {dispensed.slice(0, 8).map((rx: any) => (
                            <div key={rx.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                                <CheckCircle2 size={13} className="text-green-500 shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-gray-800 truncate">
                                        {rx.patients?.name ?? `Patient #${rx.patient_id?.slice(-6) ?? "—"}`}
                                    </p>
                                    <p className="text-[10px] text-gray-400 mt-0.5">
                                        {rx.drug_name ?? "Prescription"}{rx.dosage ? ` · ${rx.dosage}` : ""}
                                    </p>
                                </div>
                                {Number(rx.price) > 0 && (
                                    <p className="text-xs font-bold text-green-600 shrink-0">{fmtNaira(Number(rx.price))}</p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}







// "use client";

// import React, { useState, useMemo } from "react";
// import {
//     usePendingPrescriptions,
//     usePrescriptionsByPatient,
//     useUpdatePrescription,
//     useCreateDispensingRecord,
//     useDrugInventory,
//     useActiveDrugs,
//     useRestockDrug,
// } from "@/hooks/emr/use-pharmacy";
// import { useSearchPatients } from "@/hooks/emr/use-patients";
// import { useAuth } from "@/context/auth-provider";
// import { toast } from "sonner";
// import {
//     Pill, Search, X, CheckCircle2, Loader2, AlertTriangle,
//     RefreshCcw, User, Phone, Clock, Package, ArrowUpCircle,
//     ClipboardList, ChevronRight, AlertCircle, Layers,
//     TrendingDown, ShieldAlert, History, Inbox,
// } from "lucide-react";
// import { usePharmacyStore, PharmacyTab } from "@/store/pharmacy-store";

// const fmtNaira = (n?: number) => n !== undefined ? `₦${Number(n).toLocaleString("en-NG", { minimumFractionDigits: 2 })}` : "—";
// const fmtDate = (iso?: string) => iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

// // ─── Pending Prescription Card ─────────────────────────────────────────────────

// function PrescriptionCard({
//     prescription,
//     onDispense,
//     dispensing,
// }: {
//     prescription: any;
//     onDispense: (id: string) => void;
//     dispensing: boolean;
// }) {
//     const hasAllergy = prescription.patients?.allergies &&
//         prescription.drug_name &&
//         prescription.patients.allergies.toLowerCase().includes(
//             prescription.drug_name.split(" ")[0].toLowerCase()
//         );

//     return (
//         <div className={`bg-white rounded-2xl border shadow-sm p-5 space-y-4 transition-all hover:shadow-md
//             ${hasAllergy ? "border-red-200 bg-red-50/30" : "border-gray-100"}`}>

//             {/* Patient info */}
//             <div className="flex items-start justify-between gap-3">
//                 <div className="flex items-center gap-3">
//                     <div className="w-10 h-10 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center font-black text-violet-600 text-sm shrink-0">
//                         {(prescription.patients?.name ?? "?")[0].toUpperCase()}
//                     </div>
//                     <div>
//                         <p className="text-sm font-bold text-gray-900">{prescription.patients?.name ?? "Unknown Patient"}</p>
//                         <div className="flex items-center gap-2 mt-0.5">
//                             {prescription.patients?.phone && (
//                                 <div className="flex items-center gap-1">
//                                     <Phone size={10} className="text-gray-400" />
//                                     <p className="text-[10px] text-gray-400">{prescription.patients.phone}</p>
//                                 </div>
//                             )}
//                         </div>
//                     </div>
//                 </div>
//                 <div className="flex items-center gap-1.5 text-xs font-bold text-gray-400">
//                     <Clock size={11} />
//                     {fmtDate(prescription.created_at)}
//                 </div>
//             </div>

//             {/* Drug info */}
//             <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-2">
//                 <div className="flex items-center gap-2 flex-wrap">
//                     <Pill size={13} className="text-violet-600 shrink-0" />
//                     <p className="text-sm font-bold text-gray-900">{prescription.drug_name}</p>
//                     {prescription.requires_prescription && (
//                         <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-100">
//                             <ShieldAlert size={8} className="inline mr-0.5" />Rx
//                         </span>
//                     )}
//                 </div>
//                 <div className="grid grid-cols-2 gap-2 text-xs">
//                     <div>
//                         <p className="text-gray-400 font-medium">Dosage</p>
//                         <p className="font-bold text-gray-700">{prescription.dosage ?? "—"}</p>
//                     </div>
//                     <div>
//                         <p className="text-gray-400 font-medium">Duration</p>
//                         <p className="font-bold text-gray-700">{prescription.duration ?? "—"}</p>
//                     </div>
//                     {prescription.price > 0 && (
//                         <div>
//                             <p className="text-gray-400 font-medium">Price</p>
//                             <p className="font-bold text-gray-900">{fmtNaira(prescription.price)}</p>
//                         </div>
//                     )}
//                 </div>
//                 {prescription.notes && (
//                     <p className="text-[11px] text-gray-500 italic border-t border-gray-100 pt-2">{prescription.notes}</p>
//                 )}
//             </div>

//             {/* Allergy warning */}
//             {hasAllergy && (
//                 <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-xl">
//                     <AlertCircle size={13} className="text-red-600 shrink-0" />
//                     <p className="text-xs font-bold text-red-700">
//                         ⚠ Potential allergy: patient is allergic to {prescription.patients.allergies}
//                     </p>
//                 </div>
//             )}

//             {/* Action */}
//             <button
//                 onClick={() => onDispense(prescription.id)}
//                 disabled={dispensing || prescription.dispensed}
//                 className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold shadow-sm shadow-violet-200 transition-all disabled:opacity-60 disabled:cursor-not-allowed">
//                 {dispensing
//                     ? <><Loader2 size={13} className="animate-spin" /> Dispensing...</>
//                     : <><CheckCircle2 size={13} /> Dispense Drug</>
//                 }
//             </button>
//         </div>
//     );
// }

// // ─── Prescription History Tab ─────────────────────────────────────────────────

// function PrescriptionHistoryTab() {
//     const { query, patientId, setField } = usePharmacyStore();
//     const { data: results, isLoading: searching } = useSearchPatients(query);
//     const { data: history, isLoading: hLoading } = usePrescriptionsByPatient(patientId ?? "");

//     return (
//         <div className="space-y-5">
//             <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
//                 <p className="text-sm font-bold text-gray-900">Search Patient</p>
//                 <div className="relative">
//                     <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
//                     <input value={query} onChange={e => { setField("query", e.target.value); setField("patientId", null); }}
//                         placeholder="Search by name, phone, or email..."
//                         className="w-full h-10 pl-9 pr-4 rounded-xl border border-gray-200 bg-gray-50 text-sm placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-violet-400/20 focus:border-violet-400 focus:bg-white transition-all" />
//                     {query && <button onClick={() => { setField("query", ""); setField("patientId", null); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"><X size={13} /></button>}
//                 </div>

//                 {/* Search results */}
//                 {query && !patientId && (
//                     <div className="border border-gray-100 rounded-xl overflow-hidden">
//                         {searching ? (
//                             <div className="flex items-center gap-2 p-4"><Loader2 size={14} className="text-violet-500 animate-spin" /><p className="text-sm text-gray-400">Searching...</p></div>
//                         ) : results && results.length > 0 ? (
//                             (results as any[]).map(p => (
//                                 <button key={p.id} onClick={() => { setField("patientId", p.id); setField("query", p.name); }}
//                                     className="w-full flex items-center gap-3 px-4 py-3 hover:bg-violet-50 transition-colors border-b border-gray-50 last:border-0 text-left">
//                                     <div className="w-8 h-8 rounded-xl bg-violet-50 flex items-center justify-center font-bold text-violet-600 text-xs shrink-0">
//                                         {p.name[0].toUpperCase()}
//                                     </div>
//                                     <div className="flex-1 min-w-0">
//                                         <p className="text-sm font-bold text-gray-900 truncate">{p.name}</p>
//                                         <p className="text-[10px] text-gray-400">{p.phone}</p>
//                                     </div>
//                                     <ChevronRight size={14} className="text-gray-400 shrink-0" />
//                                 </button>
//                             ))
//                         ) : (
//                             <p className="text-sm text-gray-400 p-4 text-center">No patients found</p>
//                         )}
//                     </div>
//                 )}
//             </div>

//             {/* History */}
//             {patientId && (
//                 <div className="space-y-3">
//                     {hLoading ? (
//                         <div className="flex items-center justify-center py-10 gap-3">
//                             <Loader2 size={16} className="text-violet-500 animate-spin" />
//                             <p className="text-sm text-gray-400">Loading history...</p>
//                         </div>
//                     ) : !history?.length ? (
//                         <div className="flex flex-col items-center justify-center py-10 gap-3 bg-white rounded-2xl border border-gray-100 shadow-sm">
//                             <History size={20} className="text-gray-300" />
//                             <p className="text-sm font-semibold text-gray-500">No prescription history</p>
//                         </div>
//                     ) : (
//                         (history as any[]).map(p => (
//                             <div key={p.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
//                                 <div className="flex items-start justify-between gap-2">
//                                     <div>
//                                         <div className="flex items-center gap-2">
//                                             <Pill size={13} className="text-violet-600" />
//                                             <p className="text-sm font-bold text-gray-900">{p.drug_name}</p>
//                                         </div>
//                                         <p className="text-xs text-gray-500 mt-1">{p.dosage} · {p.duration ?? "—"}</p>
//                                         {p.notes && <p className="text-[10px] text-gray-400 italic mt-1">{p.notes}</p>}
//                                     </div>
//                                     <div className="text-right shrink-0">
//                                         <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold
//                                             ${p.dispensed ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>
//                                             {p.dispensed ? "Dispensed" : "Pending"}
//                                         </span>
//                                         <p className="text-[10px] text-gray-400 mt-1">{fmtDate(p.created_at)}</p>
//                                         {p.price > 0 && <p className="text-xs font-bold text-gray-700 mt-0.5">{fmtNaira(p.price)}</p>}
//                                     </div>
//                                 </div>
//                             </div>
//                         ))
//                     )}
//                 </div>
//             )}
//         </div>
//     );
// }

// // ─── Inventory Tab ─────────────────────────────────────────────────────────────

// function InventoryTab() {
//     const { data: drugs, isLoading, refetch } = useDrugInventory();
//     const { mutate: restock } = useRestockDrug();
//     const { restockId, restockQty, restocking, search, setField } = usePharmacyStore();

//     const filtered = useMemo(() => {
//         if (!drugs) return [];
//         return (drugs as any[]).filter(d =>
//             !search || d.drug_name?.toLowerCase().includes(search.toLowerCase())
//         );
//     }, [drugs, search]);

//     const lowStock = (drugs as any[] ?? []).filter(d => d.quantity <= (d.reorder_level ?? 10) && d.quantity > 0).length;
//     const outOfStk = (drugs as any[] ?? []).filter(d => d.quantity === 0).length;

//     const handleRestock = async () => {
//         if (!restockId) return;
//         const qty = parseInt(restockQty);
//         if (isNaN(qty) || qty <= 0) { toast.error("Enter a valid quantity."); return; }
//         setField("restocking", true);
//         try {
//             restock({
//                 id: restockId,
//                 qty,

//             });
//             toast.success("Stock updated.");
//             setField("restockId", null); setField("restockQty", ""); refetch();
//         } catch { toast.error("Restock failed."); }
//         finally { setField("restocking", false); }
//     };

//     return (
//         <div className="space-y-5">
//             {/* Summary stats */}
//             <div className="grid grid-cols-3 gap-3">
//                 {[
//                     { label: "Total Drugs", value: drugs?.length ?? 0, icon: Package, color: "text-violet-600", bg: "bg-violet-50" },
//                     { label: "Low Stock", value: lowStock, icon: TrendingDown, color: "text-amber-600", bg: "bg-amber-50" },
//                     { label: "Out of Stock", value: outOfStk, icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50" },
//                 ].map(({ label, value, icon: Icon, color, bg }) => (
//                     <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-4 flex items-center gap-3">
//                         <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
//                             <Icon size={16} className={color} />
//                         </div>
//                         <div>
//                             <p className="text-xl font-extrabold text-gray-900 leading-none">{value}</p>
//                             <p className="text-[10px] text-gray-400 font-medium mt-0.5">{label}</p>
//                         </div>
//                     </div>
//                 ))}
//             </div>

//             {/* Restock modal (inline) */}
//             {restockId && (
//                 <div className="bg-white rounded-2xl border border-green-100 shadow-sm p-5 space-y-3">
//                     <p className="text-sm font-bold text-gray-900">Restock Drug</p>
//                     <div className="flex items-center gap-3">
//                         <input type="number" min="1" value={restockQty} onChange={e => setField("restockQty", e.target.value)}
//                             placeholder="Add quantity..."
//                             className="flex-1 h-10 px-3 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-green-400/25 focus:border-green-400 focus:bg-white transition-all" />
//                         <button onClick={handleRestock} disabled={restocking}
//                             className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-bold disabled:opacity-60 transition-colors">
//                             {restocking ? <Loader2 size={13} className="animate-spin" /> : <ArrowUpCircle size={13} />}
//                             Restock
//                         </button>
//                         <button onClick={() => { setField("restockId", null); setField("restockQty", ""); }}
//                             className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-700">
//                             <X size={14} />
//                         </button>
//                     </div>
//                 </div>
//             )}

//             {/* Drug list */}
//             <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
//                 <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-50">
//                     <div className="relative flex-1">
//                         <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
//                         <input value={search} onChange={e => setField("search", e.target.value)} placeholder="Search drugs..."
//                             className="w-full h-9 pl-9 pr-4 rounded-xl border border-gray-200 bg-gray-50 text-sm placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-violet-400/20 focus:border-violet-400 focus:bg-white transition-all" />
//                     </div>
//                     <button onClick={() => refetch()} className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors shrink-0">
//                         <RefreshCcw size={13} />
//                     </button>
//                 </div>

//                 {isLoading ? (
//                     <div className="flex items-center justify-center py-10 gap-3">
//                         <Loader2 size={16} className="text-violet-500 animate-spin" />
//                         <p className="text-sm text-gray-400">Loading inventory...</p>
//                     </div>
//                 ) : (
//                     <div className="divide-y divide-gray-50">
//                         {filtered.map((d: any) => {
//                             const outStk = d.quantity === 0;
//                             const lowStk = d.quantity <= (d.reorder_level ?? 10) && !outStk;
//                             return (
//                                 <div key={d.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50/60 transition-colors">
//                                     <div className="flex-1 min-w-0">
//                                         <p className="text-sm font-bold text-gray-900 truncate">{d.drug_name}</p>
//                                         <p className="text-[10px] text-gray-400">{d.category ?? "—"} · {d.dosage_form ?? ""} {d.strength ?? ""}</p>
//                                     </div>
//                                     <div className="text-right shrink-0 mr-2">
//                                         <p className={`text-sm font-bold ${outStk ? "text-red-600" : lowStk ? "text-amber-600" : "text-gray-800"}`}>
//                                             {d.quantity} {d.unit}
//                                         </p>
//                                         {outStk && <p className="text-[10px] text-red-500 font-bold">Out of stock</p>}
//                                         {lowStk && <p className="text-[10px] text-amber-500 font-bold">Low stock</p>}
//                                     </div>
//                                     <div className="text-right shrink-0 mr-2">
//                                         <p className="text-sm font-bold text-gray-900">{fmtNaira(d.price)}</p>
//                                         <p className="text-[10px] text-gray-400">per {d.unit?.toLowerCase()}</p>
//                                     </div>
//                                     <button onClick={() => { setField("restockId", d.id); setField("restockQty", ""); }}
//                                         className="w-8 h-8 rounded-xl border border-gray-200 bg-white flex items-center justify-center text-gray-400 hover:text-green-600 hover:border-green-200 transition-colors shrink-0">
//                                         <ArrowUpCircle size={14} />
//                                     </button>
//                                 </div>
//                             );
//                         })}
//                     </div>
//                 )}
//             </div>
//         </div>
//     );
// }

// // ─── Main PharmacySuite ────────────────────────────────────────────────────────

// export default function PharmacySuite() {
//     const { user } = useAuth();
//     const { activeTab, dispensingId, setField } = usePharmacyStore();

//     const { data: pending, isLoading: qLoading, refetch } = usePendingPrescriptions();
//     const { mutate: updatePx } = useUpdatePrescription();
//     const { mutate: logDispense } = useCreateDispensingRecord();

//     const handleDispense = async (prescriptionId: string) => {
//         setField("dispensingId", prescriptionId);
//         try {
//             // 1. Mark prescription as dispensed
//             updatePx({
//                 id: prescriptionId,
//                 updates: {

//                     updated_at: new Date().toISOString(),
//                     status: "Dispensed",
//                 }
//             });

//             // 2. Log dispensing record
//             logDispense({
//                 prescription_id: prescriptionId,
//                 dispensed_by: user?.id ?? null,
//                 dispensed_at: new Date().toISOString(),
//             });

//             toast.success("Drug dispensed successfully. Payment record created.");
//             refetch();
//         } catch (err: any) {
//             toast.error(err?.message ?? "Failed to dispense. Please try again.");
//         } finally {
//             setField("dispensingId", null);
//         }
//     };

//     const tabs: { id: PharmacyTab; label: string; icon: React.ElementType; count?: number }[] = [
//         { id: "queue", label: "Prescription Queue", icon: Inbox, count: pending?.length ?? 0 },
//         { id: "dispense", label: "Patient History", icon: History, },
//         { id: "inventory", label: "Inventory", icon: Layers, },
//     ];

//     return (
//         <div className="space-y-6">

//             {/* Header */}
//             <div>
//                 <h1 className="text-xl font-black text-gray-900">Pharmacy</h1>
//                 <p className="text-xs text-gray-400 mt-0.5">Dispense medications, manage stock</p>
//             </div>

//             {/* Tabs */}
//             <div className="flex items-center gap-1 bg-gray-100 rounded-2xl p-1">
//                 {tabs.map(tab => {
//                     const Icon = tab.icon;
//                     const isActive = activeTab === tab.id;
//                     return (
//                         <button key={tab.id} onClick={() => setField("activeTab", tab.id)}
//                             className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all
//                                 ${isActive ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
//                             <Icon size={13} />
//                             <span className="hidden sm:inline">{tab.label}</span>
//                             {tab.count !== undefined && tab.count > 0 && (
//                                 <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black
//                                     ${isActive ? "bg-violet-100 text-violet-700" : "bg-gray-200 text-gray-500"}`}>
//                                     {tab.count}
//                                 </span>
//                             )}
//                         </button>
//                     );
//                 })}
//             </div>

//             {/* Tab content */}

//             {/* ── Queue ── */}
//             {activeTab === "queue" && (
//                 <div className="space-y-4">
//                     <div className="flex items-center justify-between">
//                         <p className="text-sm font-semibold text-gray-600">
//                             {pending?.length ?? 0} prescription{(pending?.length ?? 0) !== 1 ? "s" : ""} awaiting dispensing
//                         </p>
//                         <button onClick={() => refetch()} className="w-8 h-8 rounded-xl border border-gray-200 bg-white flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors">
//                             <RefreshCcw size={13} />
//                         </button>
//                     </div>

//                     {qLoading ? (
//                         <div className="flex items-center justify-center py-16 gap-3 bg-white rounded-2xl border border-gray-100 shadow-sm">
//                             <Loader2 size={18} className="text-violet-500 animate-spin" />
//                             <p className="text-sm text-gray-400">Loading prescriptions...</p>
//                         </div>
//                     ) : !pending?.length ? (
//                         <div className="flex flex-col items-center justify-center py-16 gap-3 bg-white rounded-2xl border border-gray-100 shadow-sm">
//                             <CheckCircle2 size={24} className="text-green-500" />
//                             <p className="text-sm font-semibold text-gray-500">Queue is clear</p>
//                             <p className="text-xs text-gray-400">All prescriptions have been dispensed.</p>
//                         </div>
//                     ) : (
//                         <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
//                             {(pending as any[]).map(p => (
//                                 <PrescriptionCard
//                                     key={p.id}
//                                     prescription={p}
//                                     onDispense={handleDispense}
//                                     dispensing={dispensingId === p.id}
//                                 />
//                             ))}
//                         </div>
//                     )}
//                 </div>
//             )}

//             {/* ── Patient History ── */}
//             {activeTab === "dispense" && <PrescriptionHistoryTab />}

//             {/* ── Inventory ── */}
//             {activeTab === "inventory" && <InventoryTab />}
//         </div>
//     );
// }