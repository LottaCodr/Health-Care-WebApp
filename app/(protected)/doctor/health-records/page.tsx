import { getAllPatients } from "@/lib/supabase-service";
import Link from "next/link";
import { FileText, Search } from "lucide-react";

export default async function DoctorRecordsPage() {
    const patients = await getAllPatients();
    return (
        <div className="space-y-5">
            <div>
                <h1 className="text-lg font-black text-gray-900">Patient Records</h1>
                <p className="text-xs text-gray-400 mt-0.5">Search and view complete patient histories</p>
            </div>
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-5 space-y-2.5">
                    {patients.map((p) => (
                        <Link key={p.id} href={`/doctor/records/${p.id}`}
                            className="flex items-center gap-4 p-4 rounded-2xl border border-gray-100 bg-gray-50/50 hover:bg-white hover:border-red-100 hover:shadow-sm transition-all group">
                            <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center font-black text-red-600 text-sm shrink-0">
                                {p.name?.[0]?.toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-gray-800">{p.name}</p>
                                <p className="text-xs text-gray-400 mt-0.5">{p.phone} · {p.gender}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <span className="text-xs font-bold text-red-600 hidden sm:block group-hover:text-red-700">
                                    View Record
                                </span>
                                <FileText size={14} className="text-gray-300 group-hover:text-red-400 transition-colors" />
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}