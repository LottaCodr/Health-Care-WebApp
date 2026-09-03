"use client";

import React from "react";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
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
    Phone,
    Mail,
    ShieldCheck,
    Activity,
} from "lucide-react";
import {
    CareTeamMember,
    getRoleVisualToken,
    formatStaffName,
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

interface StaffHoverCardProps {
    member: CareTeamMember;
    children: React.ReactNode;
    align?: "start" | "center" | "end";
    side?: "top" | "bottom" | "left" | "right";
}

export function StaffHoverCard({
    member,
    children,
    align = "center",
    side = "top",
}: StaffHoverCardProps) {
    const token = getRoleVisualToken(member.role);
    const IconComponent = ICON_MAP[token.iconName] ?? User;
    const fullName = formatStaffName(member.name, member.role, "full");

    return (
        <Popover>
            <PopoverTrigger asChild>{children}</PopoverTrigger>
            <PopoverContent
                align={align}
                side={side}
                sideOffset={6}
                className="w-80 p-0 rounded-2xl border border-gray-100 bg-white shadow-xl overflow-hidden z-50 text-slate-800 animate-in fade-in-0 zoom-in-95 duration-150"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header Strip with Role Accent */}
                <div className={`px-4 py-3 border-b flex items-center justify-between ${token.bg} ${token.border}`}>
                    <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-7 h-7 rounded-lg bg-white shadow-xs border flex items-center justify-center shrink-0 ${token.border}`}>
                            <IconComponent size={14} className={token.accentColor} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-wider text-gray-500">
                                {token.label}
                            </p>
                            <p className="text-xs font-bold text-gray-900 truncate">
                                {member.department || "Clinical Staff"}
                            </p>
                        </div>
                    </div>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${token.badgeBg} ${token.badgeText} ${token.border}`}>
                        {token.role}
                    </span>
                </div>

                {/* Profile Body */}
                <div className="p-4 space-y-3.5">
                    <div className="flex items-center gap-3">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-sm text-white shadow-xs shrink-0 ${
                            token.iconName === "stethoscope" ? "bg-indigo-600" :
                            token.iconName === "heart-pulse" ? "bg-teal-600" :
                            token.iconName === "flask-conical" ? "bg-purple-600" :
                            token.iconName === "radio" ? "bg-cyan-600" :
                            token.iconName === "pill" ? "bg-emerald-600" :
                            token.iconName === "scissors" ? "bg-rose-600" : "bg-slate-700"
                        }`}>
                            {member.initials}
                        </div>
                        <div className="min-w-0 flex-1">
                            <h4 className="text-sm font-bold text-gray-900 truncate">
                                {fullName}
                            </h4>
                            <p className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                                <ShieldCheck size={12} className="text-blue-500" />
                                Verified Care Provider
                            </p>
                        </div>
                    </div>

                    {/* Action & Timestamp Card */}
                    <div className="bg-slate-50/80 rounded-xl p-2.5 border border-slate-100 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                            <span className="font-semibold text-slate-700 flex items-center gap-1.5 truncate">
                                <Activity size={12} className={token.accentColor} />
                                {member.activity.label}
                            </span>
                            <span className="text-[10px] font-medium text-slate-400 shrink-0">
                                {timeAgo(member.activity.timestamp)}
                            </span>
                        </div>
                        {member.activity.details && (
                            <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                                {member.activity.details}
                            </p>
                        )}
                        <div className="pt-1 flex items-center gap-1 text-[10px] text-slate-400">
                            <Clock size={10} />
                            <span>{fmtFull(member.activity.timestamp)}</span>
                        </div>
                    </div>

                    {/* Contact details if available */}
                    {(member.phone || member.email) && (
                        <div className="flex items-center gap-3 pt-1 text-[11px] text-gray-500 border-t border-gray-100">
                            {member.phone && (
                                <span className="flex items-center gap-1 truncate">
                                    <Phone size={11} className="text-gray-400" />
                                    {member.phone}
                                </span>
                            )}
                            {member.email && (
                                <span className="flex items-center gap-1 truncate">
                                    <Mail size={11} className="text-gray-400" />
                                    {member.email}
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}
