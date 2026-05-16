// /**
//  * Patient Status Management Utilities
//  * Centralized logic for patient status transitions and flow
//  */

// import { PatientStatus } from "@/types/models";

// /**
//  * Status Transition Rules
//  * Defines allowed transitions between patient statuses
//  */
// export const STATUS_TRANSITIONS: Record<PatientStatus, PatientStatus[]> = {
//     [PatientStatus.Registered]: [PatientStatus.AwaitingConsultation],
//     [PatientStatus.AwaitingConsultation]: [PatientStatus.UnderConsultation],
//     [PatientStatus.UnderConsultation]: [
//         PatientStatus.SentToNurse,
//         PatientStatus.SentToLab,
//         PatientStatus.SentToPharmacy,
//         PatientStatus.AwaitingPayment,
//     ],
//     [PatientStatus.SentToNurse]: [PatientStatus.AwaitingPayment],
//     [PatientStatus.SentToLab]: [PatientStatus.AwaitingPayment],
//     [PatientStatus.SentToPharmacy]: [PatientStatus.AwaitingPayment],
//     [PatientStatus.AwaitingPayment]: [PatientStatus.Discharged],
//     [PatientStatus.AwaitingDoctorReview]: [
//         PatientStatus.AwaitingPayment,
//         PatientStatus.SentToLab,
//     ],
//     [PatientStatus.AwaitingNextStep]: [
//         PatientStatus.SentToNurse,
//         PatientStatus.SentToLab,
//         PatientStatus.SentToPharmacy,
//     ],
//     [PatientStatus.Discharged]: [],
//     [PatientStatus.Cancelled]: [],
// };

// /**
//  * Validate if a status transition is allowed
//  */
// export function isValidTransition(
//     fromStatus: PatientStatus,
//     toStatus: PatientStatus
// ): boolean {
//     const allowedTransitions = STATUS_TRANSITIONS[fromStatus];
//     return allowedTransitions.includes(toStatus);
// }

// /**
//  * Get the next logical status based on services provided
//  */
// export function getNextStatus(
//     hasNursingActions: boolean,
//     hasLabRequests: boolean,
//     hasPrescription: boolean
// ): PatientStatus {
//     // Priority: Nursing > Lab > Pharmacy > Payment
//     if (hasNursingActions) return PatientStatus.SentToNurse;
//     if (hasLabRequests) return PatientStatus.SentToLab;
//     if (hasPrescription) return PatientStatus.SentToPharmacy;
//     return PatientStatus.AwaitingPayment;
// }

// /**
//  * Get human-readable status label
//  */
// export function getStatusLabel(status: PatientStatus): string {
//     const labels: Record<PatientStatus, string> = {
//         [PatientStatus.Registered]: "Registered",
//         [PatientStatus.AwaitingConsultation]: "Awaiting Consultation",
//         [PatientStatus.UnderConsultation]: "Under Consultation",
//         [PatientStatus.SentToNurse]: "Sent to Nurse",
//         [PatientStatus.SentToLab]: "Sent to Lab",
//         [PatientStatus.SentToPharmacy]: "Sent to Pharmacy",
//         [PatientStatus.AwaitingPayment]: "Awaiting Payment",
//         [PatientStatus.AwaitingDoctorReview]: "Awaiting Doctor Review",
//         [PatientStatus.AwaitingNextStep]: "Awaiting Next Step",
//         [PatientStatus.Discharged]: "Discharged",
//         [PatientStatus.Cancelled]: "Cancelled",
//     };
//     return labels[status];
// }

// /**
//  * Get status color for UI
//  */
// export function getStatusColor(status: PatientStatus): string {
//     const colors: Record<PatientStatus, string> = {
//         [PatientStatus.Registered]: "bg-slate-100 text-slate-800",
//         [PatientStatus.AwaitingConsultation]: "bg-blue-100 text-blue-800",
//         [PatientStatus.UnderConsultation]: "bg-purple-100 text-purple-800",
//         [PatientStatus.SentToNurse]: "bg-pink-100 text-pink-800",
//         [PatientStatus.SentToLab]: "bg-orange-100 text-orange-800",
//         [PatientStatus.SentToPharmacy]: "bg-green-100 text-green-800",
//         [PatientStatus.AwaitingPayment]: "bg-yellow-100 text-yellow-800",
//         [PatientStatus.AwaitingDoctorReview]: "bg-indigo-100 text-indigo-800",
//         [PatientStatus.AwaitingNextStep]: "bg-cyan-100 text-cyan-800",
//         [PatientStatus.Discharged]: "bg-emerald-100 text-emerald-800",
//         [PatientStatus.Cancelled]: "bg-red-100 text-red-800",
//     };
//     return colors[status];
// }

// /**
//  * Get which role(s) should handle the patient in current status
//  */
// export function getResponsibleRole(status: PatientStatus): string[] {
//     const roles: Record<PatientStatus, string[]> = {
//         [PatientStatus.Registered]: ["FrontDesk"],
//         [PatientStatus.AwaitingConsultation]: ["FrontDesk", "Doctor"],
//         [PatientStatus.UnderConsultation]: ["Doctor"],
//         [PatientStatus.SentToNurse]: ["Nurse"],
//         [PatientStatus.SentToLab]: ["LabTechnician"],
//         [PatientStatus.SentToPharmacy]: ["Pharmacist"],
//         [PatientStatus.AwaitingPayment]: ["FrontDesk"],
//         [PatientStatus.AwaitingDoctorReview]: ["Doctor"],
//         [PatientStatus.AwaitingNextStep]: ["Doctor", "FrontDesk"],
//         [PatientStatus.Discharged]: [],
//         [PatientStatus.Cancelled]: [],
//     };
//     return roles[status];
// }

// /**
//  * Get status description for UI tooltips
//  */
// export function getStatusDescription(status: PatientStatus): string {
//     const descriptions: Record<PatientStatus, string> = {
//         [PatientStatus.Registered]: "Patient has been registered in the system",
//         [PatientStatus.AwaitingConsultation]:
//             "Patient is in queue waiting for doctor consultation",
//         [PatientStatus.UnderConsultation]: "Patient is currently being examined by doctor",
//         [PatientStatus.SentToNurse]: "Patient has been sent for nursing care",
//         [PatientStatus.SentToLab]: "Patient requires laboratory tests",
//         [PatientStatus.SentToPharmacy]: "Patient prescription pending dispensing",
//         [PatientStatus.AwaitingPayment]: "Patient awaiting payment before discharge",
//         [PatientStatus.AwaitingDoctorReview]: "Lab results awaiting doctor review",
//         [PatientStatus.AwaitingNextStep]: "Waiting for next step in patient journey",
//         [PatientStatus.Discharged]: "Patient has been discharged from the hospital",
//         [PatientStatus.Cancelled]: "Patient visit has been cancelled",
//     };
//     return descriptions[status];
// }

// /**
//  * Patient Journey Progress Helper
//  * Shows patient progress through the system (0-100%)
//  */
// export function getPatientProgressPercentage(status: PatientStatus): number {
//     const progress: Record<PatientStatus, number> = {
//         [PatientStatus.Registered]: 10,
//         [PatientStatus.AwaitingConsultation]: 25,
//         [PatientStatus.UnderConsultation]: 40,
//         [PatientStatus.SentToNurse]: 60,
//         [PatientStatus.SentToLab]: 60,
//         [PatientStatus.SentToPharmacy]: 60,
//         [PatientStatus.AwaitingPayment]: 85,
//         [PatientStatus.AwaitingDoctorReview]: 70,
//         [PatientStatus.AwaitingNextStep]: 50,
//         [PatientStatus.Discharged]: 100,
//         [PatientStatus.Cancelled]: 0,
//     };
//     return progress[status];
// }

// /**
//  * Check if patient is actively receiving care
//  */
// export function isActiveStatus(status: PatientStatus): boolean {
//     const inactiveStatuses = [
//         PatientStatus.Registered,
//         PatientStatus.Discharged,
//         PatientStatus.Cancelled,
//     ];
//     return !inactiveStatuses.includes(status);
// }

// /**
//  * Check if status is a final state
//  */
// export function isFinalStatus(status: PatientStatus): boolean {
//     return [PatientStatus.Discharged, PatientStatus.Cancelled].includes(status);
// }

// /**
//  * Get next steps for patient in current status
//  */
// export function getNextSteps(status: PatientStatus): string[] {
//     const nextSteps: Record<PatientStatus, string[]> = {
//         [PatientStatus.Registered]: [
//             "Wait to be called by front desk",
//             "Move to consultation queue",
//         ],
//         [PatientStatus.AwaitingConsultation]: [
//             "Wait for doctor consultation",
//         ],
//         [PatientStatus.UnderConsultation]: [
//             "Complete consultation with doctor",
//             "Receive prescription/lab orders/nursing care instructions",
//         ],
//         [PatientStatus.SentToNurse]: [
//             "Go to nursing station",
//             "Complete nursing care",
//             "Proceed to payment",
//         ],
//         [PatientStatus.SentToLab]: [
//             "Go to lab",
//             "Complete lab tests",
//             "Wait for results",
//         ],
//         [PatientStatus.SentToPharmacy]: [
//             "Go to pharmacy",
//             "Pick up medications",
//             "Proceed to payment",
//         ],
//         [PatientStatus.AwaitingPayment]: [
//             "Go to front desk",
//             "Process payment",
//             "Get discharge papers",
//         ],
//         [PatientStatus.AwaitingDoctorReview]: [
//             "Doctor reviews lab results",
//             "Proceed to next step or payment",
//         ],
//         [PatientStatus.AwaitingNextStep]: [
//             "Wait for department assignment",
//             "Follow staff instructions",
//         ],
//         [PatientStatus.Discharged]: ["Patient visit complete"],
//         [PatientStatus.Cancelled]: ["Patient visit cancelled"],
//     };
//     return nextSteps[status];
// }
