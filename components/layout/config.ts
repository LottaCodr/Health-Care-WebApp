import { UserRole } from "@/types/models";
import {
    MdDashboard,
    MdPeople,
    MdFormatListBulleted,
    MdSettings,
    MdScience,
    MdMedicalServices,
    MdPayments,
    MdHistory,
    MdHealthAndSafety
} from "react-icons/md";
import {
    FaUserPlus,
    FaUserClock,
    FaUserCheck,
    FaFlask,
    FaPills,
    FaClipboardList
} from "react-icons/fa";

export interface NavItem {
    title: string;
    url: string;
    icon: any;
    badge?: string;
}

export interface NavSection {
    title: string;
    items: NavItem[];
}

export const NAV_CONFIG: Record<UserRole | string, { main: NavItem[]; secondary: NavItem[] }> = {
    [UserRole.FrontDesk]: {
        main: [
            { title: "Dashboard", url: "/front-desk/dashboard", icon: MdDashboard },
            { title: "Registration", url: "/front-desk/patient/new", icon: FaUserPlus },
            { title: "Queue Mgmt", url: "/front-desk/queue", icon: FaUserClock },
            { title: "Payments", url: "/front-desk/payment", icon: MdPayments },
        ],
        secondary: [
            { title: "Settings", url: "/front-desk/settings", icon: MdSettings },
        ]
    },
    [UserRole.Doctor]: {
        main: [
            { title: "Dashboard", url: "/doctor/dashboard", icon: MdDashboard },
            { title: "Consultations", url: "/doctor/patients", icon: MdMedicalServices },
            { title: "Patient Records", url: "/doctor/records", icon: MdPeople },
        ],
        secondary: [
            { title: "Settings", url: "/doctor/settings", icon: MdSettings },
        ]
    },
    [UserRole.Nurse]: {
        main: [
            { title: "Dashboard", url: "/nurse/dashboard", icon: MdDashboard },
            { title: "Triaging", url: "/nurse/queue", icon: MdHealthAndSafety },
            { title: "Nursing Tasks", url: "/nurse/tasks", icon: FaClipboardList },
        ],
        secondary: [
            { title: "Settings", url: "/nurse/settings", icon: MdSettings },
        ]
    },
    [UserRole.LabTechnician]: {
        main: [
            { title: "Dashboard", url: "/lab-tech/dashboard", icon: MdDashboard },
            { title: "Test Requests", url: "/lab-tech/requests", icon: FaFlask },
            { title: "Lab Reports", url: "/lab-tech/reports", icon: MdScience },
        ],
        secondary: [
            { title: "Settings", url: "/lab-tech/settings", icon: MdSettings },
        ]
    },
    [UserRole.Pharmacist]: {
        main: [
            { title: "Dashboard", url: "/pharmacist/dashboard", icon: MdDashboard },
            { title: "Dispensing", url: "/pharmacist/queue", icon: FaPills },
            { title: "Drug Inventory", url: "/pharmacist/inventory", icon: MdFormatListBulleted },
        ],
        secondary: [
            { title: "Settings", url: "/pharmacist/settings", icon: MdSettings },
        ]
    },
    [UserRole.Admin]: {
        main: [
            { title: "Admin Console", url: "/admin/dashboard", icon: MdDashboard },
            { title: "Staff Mgmt", url: "/admin/staff", icon: MdPeople },
            { title: "System Audit", url: "/admin/audit", icon: MdHistory },
        ],
        secondary: [
            { title: "Configuration", url: "/admin/settings", icon: MdSettings },
        ]
    }
};
