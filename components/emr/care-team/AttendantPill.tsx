"use client";

import React, { useState } from "react";
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
} from "lucide-react";
import {
    CareTeamMember,
    getRoleVisualToken,
    formatStaffName,
    normalizeRoleKey,
} from "@/types/care-team";
import { usePatientCareTeam } from "@/hooks/emr/use-care-team";
import { StaffHoverCard } from "./StaffHoverCard";
import { CareTeamDrawer } from "./CareTeamDrawer";

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

function compactTimeAgo(isoString?: string): string {
    if (!isoString) return "";
    const diff = Date.now() - new Date(isoString).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "now";
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
}

export interface AttendantPillProps {
    patientId?: string;
    attendant?: CareTeamMember | null;
    patientName?: string;
    hospitalNumber?: string;
    /** Viewer's role to pick the most relevant attendant (e.g. Doctor sees triage Nurse) */
    viewerRole?: string;
    /** Whether to show the relative timestamp */
    showTimestamp?: boolean;
    /** Whether to show the avatar icon / initials */
    showAvatar?: boolean;
    /** Subtle visual variant */
    variant?: "default" | "subtle" | "ghost" | "hero";
    /** Size */
    size?: "xs" | "sm" | "md";
    className?: string;
    /** Enable full drawer on click */
    enableDrawer?: boolean;
    onClick?: (e: React.MouseEvent) => void;
}

export function AttendantPill({
    patientId,
    attendant: directAttendant,
    patientName,
    hospitalNumber,
    viewerRole,
    showTimestamp = true,
    showAvatar = true,
    variant = "default",
    size = "sm",
    className = "",
    enableDrawer = false,
    onClick,
}: AttendantPillProps) {
    const [drawerOpen, setDrawerOpen] = useState(false);

    // If direct attendant is not supplied and patientId is given, fetch care team
    const { data: careTeam } = usePatientCareTeam(directAttendant ? undefined : patientId);

    // Resolve which attendant to highlight based on viewer role or last activity
    let activeAttendant: CareTeamMember | null = directAttendant ?? null;

    if (!activeAttendant && careTeam) {
        const vr = (viewerRole || "").toLowerCase();
        if (vr.includes("doc")) {
            // Doctor cares about triage nurse or last lab tech
            activeAttendant = careTeam.primaryNurse || careTeam.lastAttendant || careTeam.primaryDoctor || null;
        } else if (vr.includes("nurse")) {
            // Nurse cares about attending physician
            activeAttendant = careTeam.primaryDoctor || careTeam.lastAttendant || careTeam.primaryNurse || null;
        } else if (vr.includes("pharm")) {
            // Pharmacist cares about prescribing doctor
            activeAttendant = careTeam.primaryDoctor || careTeam.lastAttendant || null;
        } else {
            // Default: last attendant or primary doctor
            activeAttendant = careTeam.lastAttendant || careTeam.primaryDoctor || careTeam.primaryNurse || null;
        }
    }

    if (!activeAttendant) {
        return null; // Zero clutter: do not render noisy "No attendant" badges
    }

    const token = getRoleVisualToken(activeAttendant.role);
    const IconComponent = ICON_MAP[token.iconName] ?? User;
    const displayName = formatStaffName(activeAttendant.name, activeAttendant.role, "short");
    const timeStr = compactTimeAgo(activeAttendant.activity?.timestamp);

    const handleClick = (e: React.MouseEvent) => {
        if (onClick) {
            onClick(e);
        } else if (enableDrawer) {
            e.stopPropagation();
            setDrawerOpen(true);
        }
    };

    const isXs = size === "xs";
    const isMd = size === "md";

    const pillBody = (
        <button
            type="button"
            onClick={handleClick}
            className={`group inline-flex items-center gap-1.5 rounded-full border transition-all duration-150 text-left font-medium outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
                variant === "hero"
                    ? "bg-white/15 hover:bg-white/25 border-white/20 text-white backdrop-blur-sm px-2.5 py-1 text-xs"
                    : variant === "subtle"
                    ? "bg-slate-50 hover:bg-slate-100/90 border-slate-200/60 text-slate-700 px-2 py-0.5 text-[11px]"
                    : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700 px-2 py-0.5 text-[11px]"
            } ${isXs ? "text-[10px] px-1.5 py-0.2" : isMd ? "text-xs px-3 py-1" : ""} ${className}`}
            title={`Attended by ${formatStaffName(activeAttendant.name, activeAttendant.role, "full")}`}
        >
            {showAvatar && (
                <span
                    className={`rounded-full flex items-center justify-center shrink-0 font-bold transition-transform group-hover:scale-105 ${
                        variant === "hero"
                            ? "w-4 h-4 bg-white/20 text-white text-[9px]"
                            : `w-4 h-4 ${token.bg} ${token.text} text-[9px]`
                    }`}
                >
                    <IconComponent size={isXs ? 9 : 10} className={variant === "hero" ? "text-white" : token.accentColor} />
                </span>
            )}

            <span className={`truncate max-w-[120px] font-semibold ${variant === "hero" ? "text-white" : "text-slate-800"}`}>
                {displayName}
            </span>

            {showTimestamp && timeStr && (
                <span className={`text-[10px] tabular-nums font-normal shrink-0 ${variant === "hero" ? "text-white/70" : "text-slate-400"}`}>
                    · {timeStr}
                </span>
            )}
        </button>
    );

    return (
        <>
            <StaffHoverCard member={activeAttendant} align="start" side="top">
                {pillBody}
            </StaffHoverCard>

            {enableDrawer && (
                <CareTeamDrawer
                    open={drawerOpen}
                    onOpenChange={setDrawerOpen}
                    careTeam={careTeam}
                    patientName={patientName}
                    hospitalNumber={hospitalNumber}
                />
            )}
        </>
    );
}
