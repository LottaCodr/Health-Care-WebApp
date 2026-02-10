/**
 * Hospital EMR Application Routing & Configuration
 * Central configuration for all routes and role-based access
 */

import { UserRole } from "@/types/models";

// Application Routes
export const APP_ROUTES = {
  // Public Routes
  LOGIN: "/login",
  UNAUTHORIZED: "/unauthorized",

  // Front Desk Routes
  FRONT_DESK: {
    DASHBOARD: "/front-desk/dashboard",
    PATIENT_REGISTRATION: "/front-desk/patient-registration",
    PATIENT_QUEUE: "/front-desk/patient-queue",
    PAYMENT_CHECKOUT: "/front-desk/payment-checkout",
  },

  // Doctor Routes
  DOCTOR: {
    DASHBOARD: "/doctor/dashboard",
    PATIENT_CONSULTATION: "/doctor/patient-consultation",
    DIAGNOSIS: "/doctor/diagnosis",
    PRESCRIPTION: "/doctor/prescription",
    LAB_TEST_REQUEST: "/doctor/lab-test-request",
  },

  // Nurse Routes
  NURSE: {
    DASHBOARD: "/nurse/dashboard",
    ASSIGNED_PATIENTS: "/nurse/assigned-patients",
    PATIENT_VITALS: "/nurse/patient-vitals-entry",
    NURSING_ACTIONS: "/nurse/treatment-nursing-actions",
  },

  // Lab Technician Routes
  LAB_TECH: {
    DASHBOARD: "/lab-tech/dashboard",
    PENDING_TESTS: "/lab-tech/pending-test-requests",
    TEST_RESULT_UPLOAD: "/lab-tech/test-result-upload",
    COMPLETED_TESTS: "/lab-tech/completed-tests-history",
  },

  // Pharmacist Routes
  PHARMACY: {
    DASHBOARD: "/pharmacy/dashboard",
    PRESCRIPTION_QUEUE: "/pharmacy/prescription-queue",
    DRUG_DISPENSING: "/pharmacy/drug-dispensing",
    DISPENSED_HISTORY: "/pharmacy/dispensed-history",
  },

  // Admin Routes
  ADMIN: {
    DASHBOARD: "/admin/dashboard",
    SECURITY_AUDIT: "/admin/security-audit",
  },
};

// Primary Dashboard Routes by Role
export const ROLE_PRIMARY_ROUTES: Record<UserRole, string> = {
  [UserRole.FrontDesk]: APP_ROUTES.FRONT_DESK.DASHBOARD,
  [UserRole.Doctor]: APP_ROUTES.DOCTOR.DASHBOARD,
  [UserRole.Nurse]: APP_ROUTES.NURSE.DASHBOARD,
  [UserRole.LabTechnician]: APP_ROUTES.LAB_TECH.DASHBOARD,
  [UserRole.Pharmacist]: APP_ROUTES.PHARMACY.DASHBOARD,
  [UserRole.Admin]: APP_ROUTES.ADMIN.DASHBOARD,
};

// Role-based sidebar navigation menu
export const SIDEBAR_MENU: Record<UserRole, SidebarMenuItem[]> = {
  [UserRole.FrontDesk]: [
    {
      title: "Dashboard",
      icon: "📊",
      href: APP_ROUTES.FRONT_DESK.DASHBOARD,
      active: true,
    },
    {
      title: "Register Patient",
      icon: "➕",
      href: APP_ROUTES.FRONT_DESK.PATIENT_REGISTRATION,
    },
    {
      title: "Patient Queue",
      icon: "📋",
      href: APP_ROUTES.FRONT_DESK.PATIENT_QUEUE,
    },
    {
      title: "Payment & Checkout",
      icon: "💳",
      href: APP_ROUTES.FRONT_DESK.PAYMENT_CHECKOUT,
    },
  ],

  [UserRole.Doctor]: [
    {
      title: "Dashboard",
      icon: "👨‍⚕️",
      href: APP_ROUTES.DOCTOR.DASHBOARD,
      active: true,
    },
    {
      title: "Consultations",
      icon: "🩺",
      href: APP_ROUTES.DOCTOR.PATIENT_CONSULTATION,
    },
    {
      title: "My Patients",
      icon: "👥",
      href: APP_ROUTES.DOCTOR.DASHBOARD,
    },
  ],

  [UserRole.Nurse]: [
    {
      title: "Dashboard",
      icon: "👩‍⚕️",
      href: APP_ROUTES.NURSE.DASHBOARD,
      active: true,
    },
    {
      title: "Assigned Patients",
      icon: "👥",
      href: APP_ROUTES.NURSE.ASSIGNED_PATIENTS,
    },
    {
      title: "Vitals Entry",
      icon: "❤️",
      href: APP_ROUTES.NURSE.PATIENT_VITALS,
    },
    {
      title: "Nursing Actions",
      icon: "⚕️",
      href: APP_ROUTES.NURSE.NURSING_ACTIONS,
    },
  ],

  [UserRole.LabTechnician]: [
    {
      title: "Dashboard",
      icon: "🔬",
      href: APP_ROUTES.LAB_TECH.DASHBOARD,
      active: true,
    },
    {
      title: "Pending Tests",
      icon: "📝",
      href: APP_ROUTES.LAB_TECH.PENDING_TESTS,
    },
    {
      title: "Upload Results",
      icon: "📤",
      href: APP_ROUTES.LAB_TECH.TEST_RESULT_UPLOAD,
    },
    {
      title: "History",
      icon: "📊",
      href: APP_ROUTES.LAB_TECH.COMPLETED_TESTS,
    },
  ],

  [UserRole.Pharmacist]: [
    {
      title: "Dashboard",
      icon: "💊",
      href: APP_ROUTES.PHARMACY.DASHBOARD,
      active: true,
    },
    {
      title: "Prescription Queue",
      icon: "📋",
      href: APP_ROUTES.PHARMACY.PRESCRIPTION_QUEUE,
    },
    {
      title: "Drug Dispensing",
      icon: "💉",
      href: APP_ROUTES.PHARMACY.DRUG_DISPENSING,
    },
    {
      title: "Dispensed History",
      icon: "📊",
      href: APP_ROUTES.PHARMACY.DISPENSED_HISTORY,
    },
  ],

  [UserRole.Admin]: [
    {
      title: "Dashboard",
      icon: "🔧",
      href: APP_ROUTES.ADMIN.DASHBOARD,
      active: true,
    },
    {
      title: "Security Audit",
      icon: "🔒",
      href: APP_ROUTES.ADMIN.SECURITY_AUDIT,
    },
    {
      title: "System Settings",
      icon: "⚙️",
      href: "/admin/settings",
    },
  ],
};

// Protected routes - which roles can access which routes
export const ROUTE_ACCESS_CONTROL: Record<string, UserRole[]> = {
  "/front-desk": [UserRole.FrontDesk, UserRole.Admin],
  "/doctor": [UserRole.Doctor, UserRole.Admin],
  "/nurse": [UserRole.Nurse, UserRole.Admin],
  "/lab-tech": [UserRole.LabTechnician, UserRole.Admin],
  "/pharmacy": [UserRole.Pharmacist, UserRole.Admin],
  "/admin": [UserRole.Admin],
};

// Application Features by Role
export const ROLE_FEATURES: Record<UserRole, string[]> = {
  [UserRole.FrontDesk]: [
    "register_patient",
    "manage_queue",
    "process_payment",
    "discharge_patient",
    "view_patient_info",
  ],
  [UserRole.Doctor]: [
    "view_patient_queue",
    "start_consultation",
    "create_diagnosis",
    "prescribe_medication",
    "request_lab_tests",
    "refer_patient",
    "view_patient_records",
  ],
  [UserRole.Nurse]: [
    "view_assigned_patients",
    "record_vitals",
    "perform_nursing_actions",
    "update_patient_status",
    "view_medical_records",
  ],
  [UserRole.LabTechnician]: [
    "view_pending_tests",
    "update_test_status",
    "upload_test_results",
    "generate_lab_report",
    "view_patient_info",
  ],
  [UserRole.Pharmacist]: [
    "view_prescription_queue",
    "dispense_medication",
    "manage_inventory",
    "record_dispensing",
    "view_patient_info",
  ],
  [UserRole.Admin]: [
    "manage_users",
    "view_audit_logs",
    "configure_system",
    "generate_reports",
    "manage_all_data",
  ],
};

// Type definitions
export interface SidebarMenuItem {
  title: string;
  icon: string;
  href: string;
  badge?: number | string;
  active?: boolean;
  submenu?: SidebarMenuItem[];
}

// Navigation breadcrumbs helper
export function getBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const breadcrumbs: BreadcrumbItem[] = [
    { label: "Home", href: "/" },
  ];

  const segments = pathname.split("/").filter(Boolean);
  let path = "";

  for (const segment of segments) {
    path += `/${segment}`;

    const label = segment
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

    breadcrumbs.push({
      label,
      href: path,
    });
  }

  return breadcrumbs;
}

export interface BreadcrumbItem {
  label: string;
  href: string;
}

// Check if a user has access to a route
export function hasRouteAccess(pathname: string, userRole: UserRole): boolean {
  // Check if route matches any protected pattern
  for (const [route, allowedRoles] of Object.entries(ROUTE_ACCESS_CONTROL)) {
    if (pathname.startsWith(route)) {
      return allowedRoles.includes(userRole) || allowedRoles.includes(UserRole.Admin);
    }
  }

  // If not in protected routes, allow access
  return true;
}

// Get all accessible routes for a role
export function getAccessibleRoutes(role: UserRole): string[] {
  const routes: string[] = [];

  for (const [route, roles] of Object.entries(ROUTE_ACCESS_CONTROL)) {
    if (roles.includes(role)) {
      routes.push(route);
    }
  }

  return routes;
}

// Check if a user has a specific feature
export function hasFeature(role: UserRole, feature: string): boolean {
  return ROLE_FEATURES[role]?.includes(feature) ?? false;
}
