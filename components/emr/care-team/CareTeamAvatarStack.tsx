"use client";

import React, { useState } from "react";
import {
    Users,
    Stethoscope,
    HeartPulse,
    FlaskConical,
    Radio,
    Pill,
    UserCheck,
    Receipt,
    Scissors,
    User,
    ChevronRight,
} from "lucide-react";
import {
    CareTeamMember,
    getRoleVisualToken,
    formatStaffName,
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

export interface CareTeamAvatarStackProps {
    patientId: string;
    members?: CareTeamMember[];
    patientName?: string;
    hospitalNumber?: string;
    maxVisible?: number;
    size?: "xs" | "sm" | "md";
    variant?: "default" | "hero" | "subtle";
    showLabel?: boolean;
    interactive?: boolean;
    className?: string;
}

export function CareTeamAvatarStack({
    patientId,
    members: directMembers,
    patientName,
    hospitalNumber,
    maxVisible = 3,
    size = "sm",
    variant = "default",
    showLabel = true,
    interactive = true,
    className = "",
}: CareTeamAvatarStackProps) {
    const [drawerOpen, setDrawerOpen] = useState(false);

    const { data: careTeam } = usePatientCareTeam(directMembers ? undefined : patientId);

    const members = directMembers ?? careTeam?.members ?? [];

    if (members.length === 0) {
        return null; // Zero clutter: do not display if no care team records exist yet
    }

    const visibleMembers = members.slice(0, maxVisible);
    const overflowCount = Math.max(0, members.length - maxVisible);

    const sizeClasses = {
        xs: "w-5 h-5 text-[9px]",
        sm: "w-6 h-6 text-[10px]",
        md: "w-7 h-7 text-xs",
    }[size];

    const isHero = variant === "hero";

    return (
        <>
            <div
                className={`inline-flex items-center gap-2 ${className}`}
                onClick={(e) => {
                    if (interactive) {
                        e.stopPropagation();
                        setDrawerOpen(true);
                    }
                }}
            >
                {/* Overlapping Avatar Strip */}
                <div className="flex items-center -space-x-1.5 hover:space-x-0.5 transition-all duration-200">
                    {visibleMembers.map((member, idx) => {
                        const token = getRoleVisualToken(member.role);
                        const IconComponent = ICON_MAP[token.iconName] ?? User;

                        const avatarContent = (
                            <button
                                key={`${member.staffId}-${idx}`}
                                type="button"
                                className={`relative rounded-full font-black flex items-center justify-center shrink-0 ring-2 transition-all duration-150 hover:scale-110 hover:z-20 cursor-pointer shadow-2xs ${sizeClasses} ${
                                    isHero
                                        ? "bg-slate-800 text-white ring-white/30 hover:ring-white"
                                        : `${token.bg} ${token.text} ${token.ring} ring-white hover:shadow-xs`
                                }`}
                                title={`${formatStaffName(member.name, member.role, "full")} (${token.label})`}
                            >
                                <span className="leading-none">{member.initials}</span>
                            </button>
                        );

                        return (
                            <StaffHoverCard
                                key={`${member.staffId}-${idx}`}
                                member={member}
                                align="center"
                                side="top"
                            >
                                {avatarContent}
                            </StaffHoverCard>
                        );
                    })}

                    {overflowCount > 0 && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setDrawerOpen(true);
                            }}
                            className={`relative rounded-full font-bold flex items-center justify-center shrink-0 ring-2 transition-all duration-150 hover:scale-105 hover:z-20 cursor-pointer ${sizeClasses} ${
                                isHero
                                    ? "bg-white/20 text-white ring-white/30"
                                    : "bg-slate-100 text-slate-600 ring-white hover:bg-slate-200"
                            }`}
                            title={`+${overflowCount} more care team members`}
                        >
                            +{overflowCount}
                        </button>
                    )}
                </div>

                {/* Optional Micro-Label */}
                {showLabel && (
                    <button
                        type="button"
                        onClick={(e) => {
                            if (interactive) {
                                e.stopPropagation();
                                setDrawerOpen(true);
                            }
                        }}
                        className={`inline-flex items-center gap-1 text-[11px] font-semibold transition-colors cursor-pointer ${
                            isHero
                                ? "text-white/80 hover:text-white"
                                : "text-slate-600 hover:text-blue-600"
                        }`}
                    >
                        <span>{members.length} Attended</span>
                        <ChevronRight size={12} className={isHero ? "text-white/60" : "text-slate-400"} />
                    </button>
                )}
            </div>

            {interactive && (
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
