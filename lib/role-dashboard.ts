import { UserRole } from "@/types/models";
import { normalizeUserRole } from "@/lib/roles";

export const ROLE_DASHBOARD_MAP: Record<UserRole, string> = {
  [UserRole.FrontDesk]: "/front-desk/dashboard",
  [UserRole.Doctor]: "/doctor/dashboard",
  [UserRole.Nurse]: "/nurse/dashboard",
  [UserRole.LabTechnician]: "/lab-tech/dashboard",
  [UserRole.Pharmacist]: "/pharmacist/dashboard",
  [UserRole.Radiologist]: "/radiology/dashboard",
  [UserRole.Admin]: "/admin/dashboard",
};

export function getDashboardRoute(role?: string): string {
  const normalizedRole = normalizeUserRole(role);
  return normalizedRole ? ROLE_DASHBOARD_MAP[normalizedRole] : "/login";
}
