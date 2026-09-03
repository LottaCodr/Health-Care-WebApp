"use client";

import React from "react";
import { Consultation } from "@/types/models";
import { fmtDate, fmtFull } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Calendar, Stethoscope, ClipboardList } from "lucide-react";

export function ConsultationCard({ consultation }: { consultation: Consultation }) {
    return (
        <div className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all group">
            <div className="flex justify-between items-start mb-6">
                <div className="flex gap-3 items-center">
                    <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 transition-colors group-hover:bg-blue-600 group-hover:text-white">
                        <Stethoscope size={24} />
                    </div>
                    <div>
                        <h4 className="font-black text-gray-900 tracking-tight">
                            Case Ref: #{consultation.id.substring(0, 8).toUpperCase()}
                        </h4>
                        <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">
                            <Calendar size={10} /> {fmtDate(consultation.startTime)} at {fmtFull(consultation.startTime)}
                        </div>
                    </div>
                </div>
                <Badge variant="outline" className="rounded-full border-gray-200 text-gray-500 font-bold px-3 py-1">
                    {consultation.status}
                </Badge>
            </div>

            <div className="grid gap-4">
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100/50">
                    <p className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                        <ClipboardList size={12} className="text-yellow-600" /> Presenting Symptoms
                    </p>
                    <p className="text-sm font-medium text-gray-800 leading-relaxed">{consultation.symptoms}</p>
                </div>

                {consultation.diagnosis && (
                    <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100">
                        <p className="text-[10px] font-black text-purple-700 uppercase tracking-widest mb-1">Clinical Diagnosis</p>
                        <p className="text-sm font-bold text-purple-900 leading-relaxed">{consultation.diagnosis}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
