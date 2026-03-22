"use client";

import React from "react";
import { Patient } from "@/types/models";
import { StatusBadge } from "./StatusBadge";
import { Mail, Phone, User, Droplets, MapPin, AlertTriangle } from "lucide-react";

export function PatientInfoCard({ patient }: { patient: Patient }) {
    return (
        <div className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-sm hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-8">
                <div className="flex gap-4 items-center">
                    <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center font-black text-blue-600 text-2xl shadow-inner border border-blue-100">
                        {patient.name[0]}
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-gray-900 tracking-tight">{patient.name}</h3>
                        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">ID: {patient.id.substring(0, 12)}...</p>
                    </div>
                </div>
                <StatusBadge status={patient.status} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <div className="space-y-1">
                    <p className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        <Mail size={12} className="text-blue-500" /> Email Address
                    </p>
                    <p className="text-sm font-bold text-gray-800 truncate">{patient.email}</p>
                </div>

                <div className="space-y-1">
                    <p className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        <Phone size={12} className="text-green-500" /> Phone Number
                    </p>
                    <p className="text-sm font-bold text-gray-800">{patient.phone}</p>
                </div>

                <div className="space-y-1">
                    <p className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        <User size={12} className="text-purple-500" /> Gender / Demographic
                    </p>
                    <p className="text-sm font-bold text-gray-800">{patient.gender}</p>
                </div>

                <div className="space-y-1">
                    <p className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        <Droplets size={12} className="text-red-500" /> Blood Group
                    </p>
                    <p className="text-sm font-bold text-red-600 font-black">{patient.bloodGroup || "N/A"}</p>
                </div>

                <div className="col-span-1 lg:col-span-2 space-y-1">
                    <p className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        <MapPin size={12} className="text-orange-500" /> Primary Residence
                    </p>
                    <p className="text-sm font-bold text-gray-800">{patient.address}</p>
                </div>

                {patient.allergies && (
                    <div className="col-span-full mt-4 p-4 bg-red-50 rounded-2xl border border-red-100 flex items-start gap-3">
                        <AlertTriangle className="text-red-600 shrink-0" size={20} />
                        <div>
                            <p className="text-[10px] font-black text-red-700 uppercase tracking-widest mb-1">Critical Allergy Alert</p>
                            <p className="text-sm font-bold text-red-900">{patient.allergies}</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
