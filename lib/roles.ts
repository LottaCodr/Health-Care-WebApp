import { UserRole } from "@/types/models";

/**
 * Convert role values coming from Supabase, cached profiles, or legacy rows to
 * the canonical UserRole values used by routing and navigation.
 */
export function normalizeUserRole(role: unknown): UserRole | "" {
    if (typeof role !== "string") return "";

    const compact = role.trim().toLowerCase().replace(/[\s_-]+/g, "");
    if (!compact) return "";

    if (compact.includes("front") || compact.includes("reception")) return UserRole.FrontDesk;
    if (compact.includes("doctor") || compact.includes("physician") || compact.includes("consultant")) return UserRole.Doctor;
    if (compact.includes("nurse") || compact.includes("nursing")) return UserRole.Nurse;
    if (compact.startsWith("lab") || compact.includes("laboratory")) return UserRole.LabTechnician;
    if (compact.includes("pharm")) return UserRole.Pharmacist;
    if (compact.includes("radio") || compact.includes("imaging")) return UserRole.Radiologist;
    if (compact.includes("admin")) return UserRole.Admin;

    return "";
}

export const ROLE_LABELS: Record<UserRole, string> = {
    [UserRole.FrontDesk]: "Front Desk",
    [UserRole.Doctor]: "Doctor",
    [UserRole.Nurse]: "Nurse",
    [UserRole.LabTechnician]: "Lab Scientist",
    [UserRole.Pharmacist]: "Pharmacist",
    [UserRole.Radiologist]: "Radiologist",
    [UserRole.Admin]: "Administrator",
};

export const ROLE_SETTINGS_ROUTES: Record<UserRole, string> = {
    [UserRole.FrontDesk]: "/front-desk/settings",
    [UserRole.Doctor]: "/doctor/settings",
    [UserRole.Nurse]: "/nurse/settings",
    [UserRole.LabTechnician]: "/lab-tech/settings",
    [UserRole.Pharmacist]: "/pharmacist/settings",
    [UserRole.Radiologist]: "/radiology/settings",
    [UserRole.Admin]: "/admin/settings",
};

export function getRoleLabel(role: unknown): string {
    const normalized = normalizeUserRole(role);
    return normalized ? ROLE_LABELS[normalized] : "Staff";
}

export function getRoleSettingsRoute(role: unknown): string {
    const normalized = normalizeUserRole(role);
    return normalized ? ROLE_SETTINGS_ROUTES[normalized] : "/";
}
