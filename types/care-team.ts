import { UserRole } from "./models";

export type CareActivityType =
    | "registration"
    | "triage_vitals"
    | "consultation"
    | "nursing_care"
    | "lab_request"
    | "lab_verification"
    | "radiology_scan"
    | "pharmacy_dispense"
    | "billing_settlement"
    | "admission"
    | "surgery"
    | "discharge"
    | "general";

export interface CareTeamMember {
    staffId: string;
    name: string;
    role: UserRole | string;
    department?: string;
    avatarUrl?: string | null;
    initials: string;
    phone?: string;
    email?: string;
    isPrimary?: boolean;
    activity: {
        type: CareActivityType;
        label: string;
        details?: string;
        timestamp: string; // ISO-8601
    };
}

export interface PatientCareTeamSummary {
    patientId: string;
    primaryDoctor?: CareTeamMember | null;
    primaryNurse?: CareTeamMember | null;
    lastAttendant?: CareTeamMember | null;
    members: CareTeamMember[];
    totalCount: number;
}

// ─── Visual Tokens for Staff Roles ───────────────────────────────────────────

export interface RoleVisualToken {
    role: string;
    label: string;
    prefix: string;
    accentColor: string;
    bg: string;
    text: string;
    border: string;
    ring: string;
    badgeBg: string;
    badgeText: string;
    iconName:
        | "stethoscope"
        | "heart-pulse"
        | "flask-conical"
        | "radio"
        | "pill"
        | "user-check"
        | "receipt"
        | "scissors"
        | "user";
}

export function normalizeRoleKey(role?: string | null): string {
    if (!role) return "staff";
    const r = role.toLowerCase().replace(/[\s_-]/g, "");
    if (r.includes("doc")) return "doctor";
    if (r.includes("nurse")) return "nurse";
    if (r.includes("lab")) return "labtech";
    if (r.includes("radio")) return "radiologist";
    if (r.includes("pharm")) return "pharmacist";
    if (r.includes("front") || r.includes("desk") || r.includes("admin_front")) return "frontdesk";
    if (r.includes("admin")) return "admin";
    if (r.includes("surg")) return "surgeon";
    return "staff";
}

export const ROLE_VISUAL_TOKENS: Record<string, RoleVisualToken> = {
    doctor: {
        role: "Doctor",
        label: "Attending Physician",
        prefix: "Dr.",
        accentColor: "text-indigo-600",
        bg: "bg-indigo-50/70",
        text: "text-indigo-700",
        border: "border-indigo-200/60",
        ring: "ring-indigo-300",
        badgeBg: "bg-indigo-50",
        badgeText: "text-indigo-700",
        iconName: "stethoscope",
    },
    nurse: {
        role: "Nurse",
        label: "Attending Nurse",
        prefix: "RN",
        accentColor: "text-teal-600",
        bg: "bg-teal-50/70",
        text: "text-teal-700",
        border: "border-teal-200/60",
        ring: "ring-teal-300",
        badgeBg: "bg-teal-50",
        badgeText: "text-teal-700",
        iconName: "heart-pulse",
    },
    labtech: {
        role: "LabTechnician",
        label: "Medical Lab Scientist",
        prefix: "MLS",
        accentColor: "text-purple-600",
        bg: "bg-purple-50/70",
        text: "text-purple-700",
        border: "border-purple-200/60",
        ring: "ring-purple-300",
        badgeBg: "bg-purple-50",
        badgeText: "text-purple-700",
        iconName: "flask-conical",
    },
    radiologist: {
        role: "Radiologist",
        label: "Radiologist",
        prefix: "Rad.",
        accentColor: "text-cyan-600",
        bg: "bg-cyan-50/70",
        text: "text-cyan-700",
        border: "border-cyan-200/60",
        ring: "ring-cyan-300",
        badgeBg: "bg-cyan-50",
        badgeText: "text-cyan-700",
        iconName: "radio",
    },
    pharmacist: {
        role: "Pharmacist",
        label: "Clinical Pharmacist",
        prefix: "Pharm.",
        accentColor: "text-emerald-600",
        bg: "bg-emerald-50/70",
        text: "text-emerald-700",
        border: "border-emerald-200/60",
        ring: "ring-emerald-300",
        badgeBg: "bg-emerald-50",
        badgeText: "text-emerald-700",
        iconName: "pill",
    },
    frontdesk: {
        role: "FrontDesk",
        label: "Registrar / Front Desk",
        prefix: "Desk",
        accentColor: "text-slate-600",
        bg: "bg-slate-100/80",
        text: "text-slate-700",
        border: "border-slate-200",
        ring: "ring-slate-300",
        badgeBg: "bg-slate-100",
        badgeText: "text-slate-700",
        iconName: "user-check",
    },
    admin: {
        role: "Admin",
        label: "Administrator",
        prefix: "Admin",
        accentColor: "text-blue-600",
        bg: "bg-blue-50/70",
        text: "text-blue-700",
        border: "border-blue-200/60",
        ring: "ring-blue-300",
        badgeBg: "bg-blue-50",
        badgeText: "text-blue-700",
        iconName: "user-check",
    },
    surgeon: {
        role: "Surgeon",
        label: "Surgeon",
        prefix: "Dr.",
        accentColor: "text-rose-600",
        bg: "bg-rose-50/70",
        text: "text-rose-700",
        border: "border-rose-200/60",
        ring: "ring-rose-300",
        badgeBg: "bg-rose-50",
        badgeText: "text-rose-700",
        iconName: "scissors",
    },
    staff: {
        role: "Staff",
        label: "Care Team Member",
        prefix: "",
        accentColor: "text-gray-600",
        bg: "bg-gray-100/80",
        text: "text-gray-700",
        border: "border-gray-200",
        ring: "ring-gray-300",
        badgeBg: "bg-gray-100",
        badgeText: "text-gray-700",
        iconName: "user",
    },
};

export function getRoleVisualToken(role?: string | null): RoleVisualToken {
    const key = normalizeRoleKey(role);
    return ROLE_VISUAL_TOKENS[key] ?? ROLE_VISUAL_TOKENS.staff;
}

export function getStaffInitials(name?: string | null): string {
    if (!name || !name.trim()) return "ST";
    const parts = name.trim().replace(/^(Dr\.|Dr|RN|Pharm\.|Pharm|MLS|Mr\.|Mrs\.|Ms\.)\s+/i, "").split(/\s+/);
    if (parts.length === 1) {
        return parts[0].slice(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function formatStaffName(name?: string | null, role?: string | null, style: "short" | "full" = "short"): string {
    if (!name || !name.trim()) return "Attending Staff";
    const cleanName = name.trim().replace(/^(Dr\.|Dr|RN|Pharm\.|Pharm|MLS|Mr\.|Mrs\.|Ms\.)\s+/i, "");
    const token = getRoleVisualToken(role);
    const prefix = token.prefix ? `${token.prefix} ` : "";

    if (style === "short") {
        const parts = cleanName.split(/\s+/);
        if (parts.length > 1) {
            // E.g. Dr. A. Wright or RN F. Nightingale
            return `${prefix}${parts[0][0]}. ${parts[parts.length - 1]}`;
        }
        return `${prefix}${parts[0]}`;
    }

    return `${prefix}${cleanName}`;
}
