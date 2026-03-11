/**
 * Server-Side Access Control & Permissions
 * Enforces document-level and row-level security
 */

"use server";

import { UserRole, PatientStatus } from "@/types/models";
import { createClient } from "@/utils/supabase/server";

const DB_ID = process.env.NEXT_PUBLIC_DATABASE_ID!;

interface AccessContext {
    userId: string;
    role: UserRole;
}

interface PermissionCheck {
    allowed: boolean;
    reason?: string;
}

/**
 * Enforce role-based access to collections
 */
export async function enforceCollectionAccess(
    context: AccessContext,
    collectionName: string,
    operation: "read" | "write" | "delete"
): Promise<PermissionCheck> {
    const rolePermissions: Record<UserRole, Record<string, string[]>> = {
        [UserRole.FrontDesk]: {
            read: ["patients", "payments", "appointments"],
            write: ["patients", "payments"],
            delete: [],
        },
        [UserRole.Doctor]: {
            read: ["patients", "consultations", "prescriptions", "lab_requests", "nursing_actions"],
            write: ["consultations", "prescriptions", "lab_requests"],
            delete: [],
        },
        [UserRole.Nurse]: {
            read: ["patients", "consultations", "nursing_actions", "prescriptions"],
            write: ["nursing_actions"],
            delete: [],
        },
        [UserRole.LabTechnician]: {
            read: ["patients", "lab_requests"],
            write: ["lab_requests"],
            delete: [],
        },
        [UserRole.Pharmacist]: {
            read: ["patients", "prescriptions", "drug_dispensing"],
            write: ["prescriptions", "drug_dispensing"],
            delete: [],
        },
        [UserRole.Admin]: {
            read: ["patients", "consultations", "prescriptions", "lab_requests", "nursing_actions", "payments", "drug_dispensing", "audit_logs"],
            write: ["patients", "consultations", "prescriptions", "lab_requests", "nursing_actions", "payments", "drug_dispensing", "audit_logs"],
            delete: [],
        },
    };

    const allowedCollections = rolePermissions[context.role]?.[operation] || [];

    if (!allowedCollections.includes(collectionName)) {
        return {
            allowed: false,
            reason: `${context.role} does not have ${operation} access to ${collectionName}`,
        };
    }

    return { allowed: true };
}

/**
 * Enforce document-level access (row-level security)
 */
export async function enforceDocumentAccess(
    context: AccessContext,
    collectionName: string,
    documentId: string,
    operation: "read" | "write"
): Promise<PermissionCheck> {
    // Collection access first
    const collectionCheck = await enforceCollectionAccess(context, collectionName, operation);
    if (!collectionCheck.allowed) {
        return collectionCheck;
    }

    // Document-specific rules based on context
    const COLLECTIONS = {
        PATIENTS: process.env.NEXT_PUBLIC_PATIENT_COLLECTION_ID!,
        CONSULTATIONS: "consultations",
        PRESCRIPTIONS: "prescriptions",
        LAB_REQUESTS: "lab_requests",
        NURSING_ACTIONS: "nursing_actions",
        PAYMENTS: "payments",
    };

    // Get document to check ownership/relevance
    try {
        const supabase = await createClient();
        let document: any = null;

        const { data, error } = await supabase
            .from(collectionName)
            .select()
            .eq("id", documentId)
            .single();

        document = data;

        if (!document) {
            return { allowed: false, reason: "Document not found" };
        }

        // Role-specific document access rules
        switch (context.role) {
            case UserRole.Doctor:
                // Doctors can only access their own consultations and related prescriptions/labs
                if (collectionName === "consultations" && document.doctorId !== context.userId) {
                    return { allowed: false, reason: "Can only access own consultations" };
                }
                if (collectionName === "prescriptions" && document.doctorId !== context.userId) {
                    return { allowed: false, reason: "Can only access own prescriptions" };
                }
                if (collectionName === "lab_requests" && document.doctorId !== context.userId) {
                    return { allowed: false, reason: "Can only access own lab requests" };
                }
                break;

            case UserRole.Nurse:
                // Nurses can access patients assigned to them (nursing actions)
                if (collectionName === "nursing_actions" && document.assignedNurse !== context.userId) {
                    return { allowed: false, reason: "Can only access assigned nursing actions" };
                }
                break;

            case UserRole.LabTechnician:
                // Lab techs can read any lab request but write only pending ones
                if (collectionName === "lab_requests" && operation === "write" && document.status !== "Pending") {
                    return { allowed: false, reason: "Can only update pending lab requests" };
                }
                break;

            case UserRole.Pharmacist:
                // Pharmacists can read any prescription but write only active ones
                if (collectionName === "prescriptions" && operation === "write" && document.status !== "Active") {
                    return { allowed: false, reason: "Can only update active prescriptions" };
                }
                break;

            case UserRole.FrontDesk:
                // Front desk can only update patient payments
                if (collectionName === "payments" && document.processedBy !== context.userId) {
                    return { allowed: false, reason: "Can only manage own payment records" };
                }
                break;

            default:
                break;
        }

        return { allowed: true };
    } catch (error) {
        return { allowed: false, reason: "Access check failed" };
    }
}

/**
 * Get filtered query based on user role for listing operations
 */
export function getRowLevelSecurityFilter(context: AccessContext, collectionName: string): any[] {
    const filters: any[] = [];

    switch (context.role) {
        case UserRole.Doctor:
            if (collectionName === "consultations") {
                filters.push({ column: "doctor_id", value: context.userId });
            }
            if (collectionName === "prescriptions") {
                filters.push({ column: "doctor_id", value: context.userId });
            }
            if (collectionName === "lab_requests") {
                filters.push({ column: "doctor_id", value: context.userId });
            }
            break;

        case UserRole.Nurse:
            if (collectionName === "nursing_actions") {
                filters.push({ column: "assigned_nurse", value: context.userId });
            }
            break;

        case UserRole.Pharmacist:
            if (collectionName === "prescriptions") {
                filters.push({ column: "status", value: "Active" });
            }
            break;

        case UserRole.LabTechnician:
            if (collectionName === "lab_requests") {
                filters.push({ column: "status", value: "Pending" });
            }
            break;

        default:
            // Admin can see all
            break;
    }

    return filters;
}
