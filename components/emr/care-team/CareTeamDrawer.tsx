"use client";

import React, { useState, useMemo } from "react";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet";
import {
    Stethoscope,
    HeartPulse,
    FlaskConical,
    Radio,
    Pill,
    UserCheck,
    Receipt,
    Scissors,
    User,
    Clock,
    Users,
    Phone,
    Mail,
    ShieldCheck,
    CheckCircle2,
    Calendar,
    Activity,
    ClipboardList,
} from "lucide-react";
import {
    CareTeamMember,
    PatientCareTeamSummary,
    getRoleVisualToken,
    formatStaffName,
    normalizeRoleKey,
} from "@/types/care-team";
import { fmtFull } from "@/lib/utils";

const ICON_MAP: Record<string, React.ElementType> = {
    stethoscope: Stethoscope,
    "heart-pulse": HeartPulse,
    "flask-conical": FlaskConical,
    radio: Radio,
    pill: Pill,
    "user-check": UserCheck,
    receipt: Receipt,
    scissors: Scissors,
    user: User,
};

function timeAgo(isoString?: string): string {
    if (!isoString) return "";
    const diff = Date.now() - new Date(isoString).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ${mins % 60}m ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

interface CareTeamDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    careTeam?: PatientCareTeamSummary | null;
    patientName?: string;
    hospitalNumber?: string;
}

export function CareTeamDrawer({
    open,
    onOpenChange,
    careTeam,
    patientName,
    hospitalNumber,
}: CareTeamDrawerProps) {
    const [filter, setFilter] = useState<string>("all");

    const members = careTeam?.members ?? [];

    const filteredMembers = useMemo(() => {
        if (filter === "all") return members;
        return members.filter((m) => {
            const rk = normalizeRoleKey(m.role);
            if (filter === "medical") return rk === "doctor" || rk === "surgeon";
            if (filter === "nursing") return rk === "nurse";
            if (filter === "diagnostics") return rk === "labtech" || rk === "radiologist";
            if (filter === "pharmacy") return rk === "pharmacist";
            if (filter === "admin") return rk === "frontdesk" || rk === "admin";
            return true;
        });
    }, [members, filter]);

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="right"
                className="w-full sm:max-w-lg p-0 flex flex-col bg-white overflow-hidden border-l border-gray-100 shadow-2xl"
            >
                {/* ── Sheet Header ────────────────────────────────────────────── */}
                <div className="p-6 bg-gradient-to-br from-slate-900 to-slate-800 text-white shrink-0">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center backdrop-blur-sm">
                            <Users size={18} className="text-blue-400" />
                        </div>
                        <div>
                            <SheetTitle className="text-base font-bold text-white">
                                Attending Care Team
                            </SheetTitle>
                            <SheetDescription className="text-xs text-slate-300">
                                Multidisciplinary staff members who attended to this patient
                            </SheetDescription>
                        </div>
                    </div>

                    {(patientName || hospitalNumber) && (
                        <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-slate-300">
                            <div className="flex items-center gap-2 font-medium">
                                <User size={13} className="text-slate-400" />
                                <span className="text-white font-bold">{patientName || "Patient"}</span>
                            </div>
                            {hospitalNumber && (
                                <span className="font-mono text-[11px] bg-white/10 px-2.5 py-0.5 rounded-full text-slate-200">
                                    HN: {hospitalNumber}
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {/* ── Filter Tabs ─────────────────────────────────────────────── */}
                <div className="px-5 py-2.5 bg-slate-50 border-b border-gray-100 flex items-center gap-1.5 overflow-x-auto scrollbar-hide shrink-0">
                    {[
                        { id: "all", label: "All Staff", count: members.length },
                        { id: "medical", label: "Medical", count: members.filter((m) => ["doctor", "surgeon"].includes(normalizeRoleKey(m.role))).length },
                        { id: "nursing", label: "Nursing", count: members.filter((m) => normalizeRoleKey(m.role) === "nurse").length },
                        { id: "diagnostics", label: "Diagnostics", count: members.filter((m) => ["labtech", "radiologist"].includes(normalizeRoleKey(m.role))).length },
                        { id: "pharmacy", label: "Pharmacy", count: members.filter((m) => normalizeRoleKey(m.role) === "pharmacist").length },
                        { id: "admin", label: "Front Desk", count: members.filter((m) => ["frontdesk", "admin"].includes(normalizeRoleKey(m.role))).length },
                    ].map((tab) => {
                        const active = filter === tab.id;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setFilter(tab.id)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                                    active
                                        ? "bg-slate-900 text-white shadow-xs"
                                        : "bg-white text-gray-500 hover:text-gray-900 border border-gray-200/60"
                                }`}
                            >
                                {tab.label}
                                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                                    active ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600"
                                }`}>
                                    {tab.count}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* ── Attendants List ─────────────────────────────────────────── */}
                <div className="flex-1 overflow-y-auto p-5 space-y-3.5">
                    {filteredMembers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center mb-3">
                                <Users size={20} className="text-gray-300" />
                            </div>
                            <p className="text-sm font-bold text-gray-700">No staff records found</p>
                            <p className="text-xs text-gray-400 mt-1 max-w-xs">
                                No attendances recorded for this category during the current encounter.
                            </p>
                        </div>
                    ) : (
                        filteredMembers.map((member, idx) => {
                            const token = getRoleVisualToken(member.role);
                            const IconComponent = ICON_MAP[token.iconName] ?? User;
                            const fullName = formatStaffName(member.name, member.role, "full");

                            return (
                                <div
                                    key={`${member.staffId}-${idx}`}
                                    className="bg-white rounded-2xl border border-gray-100 shadow-xs hover:border-blue-100 hover:shadow-md transition-all p-4 space-y-3"
                                >
                                    {/* Card Top: Avatar, Role, Time */}
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs text-white shrink-0 ${
                                                token.iconName === "stethoscope" ? "bg-indigo-600" :
                                                token.iconName === "heart-pulse" ? "bg-teal-600" :
                                                token.iconName === "flask-conical" ? "bg-purple-600" :
                                                token.iconName === "radio" ? "bg-cyan-600" :
                                                token.iconName === "pill" ? "bg-emerald-600" :
                                                token.iconName === "scissors" ? "bg-rose-600" : "bg-slate-700"
                                            }`}>
                                                {member.initials}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <h4 className="text-sm font-bold text-gray-900 truncate">
                                                        {fullName}
                                                    </h4>
                                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${token.badgeBg} ${token.badgeText} ${token.border}`}>
                                                        {token.role}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-gray-500 truncate mt-0.5">
                                                    {member.department || token.label}
                                                </p>
                                            </div>
                                        </div>

                                        <span className="text-[10px] font-medium text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full shrink-0 border border-gray-100">
                                            {timeAgo(member.activity.timestamp)}
                                        </span>
                                    </div>

                                    {/* Card Middle: Clinical Activity Details */}
                                    <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-100 space-y-1">
                                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                                            <IconComponent size={13} className={token.accentColor} />
                                            <span>{member.activity.label}</span>
                                        </div>
                                        {member.activity.details && (
                                            <p className="text-xs text-slate-600 pl-5 leading-relaxed">
                                                {member.activity.details}
                                            </p>
                                        )}
                                        <div className="flex items-center gap-1 pl-5 pt-1 text-[10px] text-slate-400">
                                            <Clock size={10} />
                                            <span>{fmtFull(member.activity.timestamp)}</span>
                                        </div>
                                    </div>

                                    {/* Card Bottom: Contact / Info */}
                                    {(member.phone || member.email) && (
                                        <div className="flex items-center gap-4 text-xs text-gray-500 pt-1 border-t border-gray-50">
                                            {member.phone && (
                                                <a
                                                    href={`tel:${member.phone}`}
                                                    className="inline-flex items-center gap-1 text-slate-600 hover:text-blue-600 transition-colors"
                                                >
                                                    <Phone size={11} className="text-gray-400" />
                                                    <span>{member.phone}</span>
                                                </a>
                                            )}
                                            {member.email && (
                                                <a
                                                    href={`mailto:${member.email}`}
                                                    className="inline-flex items-center gap-1 text-slate-600 hover:text-blue-600 transition-colors truncate"
                                                >
                                                    <Mail size={11} className="text-gray-400" />
                                                    <span className="truncate">{member.email}</span>
                                                </a>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

                {/* ── Footer ─────────────────────────────────────────────────── */}
                <div className="p-4 bg-slate-50 border-t border-gray-100 text-center shrink-0">
                    <p className="text-[11px] text-gray-400">
                        Total {members.length} multidisciplinary staff registered on this patient's journey.
                    </p>
                </div>
            </SheetContent>
        </Sheet>
    );
}
