import { UserRole } from "@/types/models";
import {
    LayoutDashboard,
    Users,
    UserPlus,
    Clock,
    CreditCard,
    Stethoscope,
    ClipboardList,
    FlaskConical,
    Microscope,
    Pill,
    Package,
    ShieldCheck,
    ListChecks,
    HeartPulse,
    Settings,
    UsersRound,
    ScrollText,
    LucideIcon,
    Radio,
    Calendar,
    BedDouble,
    Scissors,
    TestTube2,
    PackageX,
    BarChart3,
    Building2,
    FolderOpen,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NavItem {
    title: string;
    url: string;
    icon: LucideIcon;
    badge?: number;
}

export interface NavConfig {
    main: NavItem[];
    secondary: NavItem[];
}

// ─── Nav config ───────────────────────────────────────────────────────────────

export const NAV_CONFIG: Record<string, NavConfig> = {

    [UserRole.FrontDesk]: {
        main: [
            { title: "Dashboard", url: "/front-desk/dashboard", icon: LayoutDashboard },
            { title: "Register", url: "/front-desk/patient/new", icon: UserPlus },
            { title: "Patients", url: "/front-desk/patient", icon: Users },
                        { title: "Admissions", url: "/front-desk/admissions", icon: Clock },
            { title: "Appointments", url: "/front-desk/appointment-booking", icon: Calendar },
            { title: "Payments", url: "/front-desk/payment", icon: CreditCard },
        ],
        secondary: [
            { title: "Settings", url: "/front-desk/settings", icon: Settings },
        ],
    },

    [UserRole.Doctor]: {
        main: [
            { title: "Dashboard", url: "/doctor/dashboard", icon: LayoutDashboard },
            { title: "Patients", url: "/doctor/patients", icon: Stethoscope },
            { title: "Records", url: "/doctor/health-records", icon: ClipboardList },
            { title: "Appointments", url: "/doctor/appointments", icon: Calendar },
            { title: "Surgery / OT", url: "/doctor/surgery", icon: Scissors },
        ],
        secondary: [
            { title: "Settings", url: "/doctor/settings", icon: Settings },
        ],
    },

    [UserRole.Nurse]: {
        main: [
            { title: "Dashboard", url: "/nurse/dashboard", icon: LayoutDashboard },
            { title: "Triaging", url: "/nurse/queue", icon: HeartPulse },
            { title: "Tasks", url: "/nurse/task", icon: ListChecks },
            { title: "Ward Board", url: "/nurse/ward-board", icon: BedDouble },
        ],
        secondary: [
            { title: "Settings", url: "/nurse/settings", icon: Settings },
        ],
    },

    // Note: DB uses "Labtech" — keep key consistent with UserRole enum value
    [UserRole.LabTechnician]: {
        main: [
            { title: "Dashboard", url: "/lab-tech/dashboard", icon: LayoutDashboard },
            { title: "Requests", url: "/lab-tech/requests", icon: FlaskConical },
            { title: "Reports", url: "/lab-tech/reports", icon: Microscope },
            { title: "Test Catalog", url: "/lab-tech/catalog", icon: Microscope },
            { title: "Specimens", url: "/lab-tech/specimens", icon: TestTube2 },
        ],
        secondary: [
            { title: "Settings", url: "/lab-tech/settings", icon: Settings },
        ],
    },

    [UserRole.Pharmacist]: {
        main: [
            { title: "Dashboard", url: "/pharmacist/dashboard", icon: LayoutDashboard },
            { title: "Dispensing", url: "/pharmacist/queue", icon: Pill },
            { title: "Inventory", url: "/pharmacist/inventory", icon: Package },
            { title: "Expiry & Batches", url: "/pharmacist/expiry", icon: PackageX },
        ],
        secondary: [
            { title: "Settings", url: "/pharmacist/settings", icon: Settings },
        ],
    },
    [UserRole.Radiologist]: {
        main: [
            { title: "Dashboard", url: "/radiology/dashboard", icon: LayoutDashboard },
            { title: "Requests", url: "/radiology/requests", icon: FlaskConical },
            { title: "Reports", url: "/radiology/reports", icon: Radio },
        ],
        secondary: [
            { title: "Settings", url: "/radiology/settings", icon: Settings },
        ],
    },

    [UserRole.Admin]: {
        main: [
            { title: "Dashboard", url: "/admin/dashboard", icon: LayoutDashboard },
            { title: "Patient Records", url: "/admin/patient", icon: FolderOpen },
            { title: "Staff Management", url: "/admin/staff", icon: UsersRound },
            { title: "Drugs Inventory", url: "/admin/stocked-drugs", icon: Pill },
            { title: "Tests Catalogue", url: "/admin/tests-catalogue", icon: Microscope },
            { title: "Audit Log", url: "/admin/audit", icon: ScrollText },
            { title: "Reports", url: "/admin/reports", icon: BarChart3 },
            { title: "Facilities", url: "/admin/facilities", icon: Building2 },
            // { title: "Radiology",  url: "/admin/radiology",   icon: Radio           },
        ],
        secondary: [
            { title: "Configuration", url: "/admin/settings", icon: Settings },
        ],
    },
};