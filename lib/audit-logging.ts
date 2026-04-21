// /**
//  * Audit Logging Utilities
//  * Centralized logging of all critical EMR actions
//  */

// "use client";

// import { logAction } from "@/lib/supabase-service";
// import { useCallback } from "react";

// export interface AuditableAction {
//     action: string;
//     entityType: string;
//     entityId: string;
//     details?: Record<string, any>;
// }

// /**
//  * Hook to log actions with current user context
//  */
// export function useAuditLog() {
//     const log = useCallback(async (userId: string | undefined, auditAction: AuditableAction) => {
//         if (!userId) return;

//         try {
//             await logAction(userId, auditAction.action, auditAction.entityType, auditAction.entityId, auditAction.details);
//         } catch (error) {
//             // Silently fail - don't break main workflow for audit failures
//             console.error("Audit logging failed:", error);
//         }
//     }, []);

//     return { log };
// }

// /**
//  * Predefined audit actions
//  */
// export const AuditActions = {
//     PATIENT_REGISTERED: "PATIENT_REGISTERED",
//     PATIENT_STATUS_CHANGED: "PATIENT_STATUS_CHANGED",
//     CONSULTATION_CREATED: "CONSULTATION_CREATED",
//     CONSULTATION_COMPLETED: "CONSULTATION_COMPLETED",
//     PRESCRIPTION_CREATED: "PRESCRIPTION_CREATED",
//     PRESCRIPTION_DISPENSED: "PRESCRIPTION_DISPENSED",
//     LAB_REQUEST_CREATED: "LAB_REQUEST_CREATED",
//     LAB_REQUEST_COMPLETED: "LAB_REQUEST_COMPLETED",
//     NURSING_ACTION_CREATED: "NURSING_ACTION_CREATED",
//     NURSING_ACTION_COMPLETED: "NURSING_ACTION_COMPLETED",
//     PAYMENT_PROCESSED: "PAYMENT_PROCESSED",
//     PATIENT_DISCHARGED: "PATIENT_DISCHARGED",
// } as const;
