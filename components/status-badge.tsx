// "use client";

// import React from "react";
// import { PatientStatus } from "@/types/models";
// import { Badge } from "@/components/ui/badge";

// interface StatusBadgeProps {
//     status: string;
//     variant?: "default" | "secondary" | "destructive" | "outline";
//     size?: "default" | "sm" | "lg";
// }

// /**
//  * PatientStatusBadge
//  * Visual indicator for patient journey status
//  */
// export function PatientStatusBadge({ status, variant = "default", size = "default" }: StatusBadgeProps) {
//     const getStatusColor = (status: string): "default" | "secondary" | "destructive" | "outline" => {
//         switch (status) {
//             // Early states
//             case PatientStatus.Registered:
//                 return "secondary";
//             case PatientStatus.AwaitingConsultation:
//                 return "default";

//             // Active states
//             case PatientStatus.UnderConsultation:
//                 return "default";
//             case PatientStatus.SentToNurse:
//                 return "secondary";
//             case PatientStatus.SentToLab:
//                 return "secondary";
//             case PatientStatus.SentToPharmacy:
//                 return "secondary";

//             // Final states
//             case PatientStatus.AwaitingPayment:
//                 return "outline";
//             case PatientStatus.Discharged:
//                 return "destructive";
//             case PatientStatus.Cancelled:
//                 return "destructive";

//             // Review states
//             case PatientStatus.AwaitingDoctorReview:
//                 return "default";
//             case PatientStatus.AwaitingNextStep:
//                 return "secondary";

//             default:
//                 return "outline";
//         }
//     };

//     const getStatusLabel = (status: string): string => {
//         switch (status) {
//             case PatientStatus.Registered:
//                 return "Registered";
//             case PatientStatus.AwaitingConsultation:
//                 return "Awaiting Consultation";
//             case PatientStatus.UnderConsultation:
//                 return "Under Consultation";
//             case PatientStatus.SentToNurse:
//                 return "Sent to Nurse";
//             case PatientStatus.SentToLab:
//                 return "Sent to Lab";
//             case PatientStatus.SentToPharmacy:
//                 return "Sent to Pharmacy";
//             case PatientStatus.AwaitingPayment:
//                 return "Awaiting Payment";
//             case PatientStatus.AwaitingDoctorReview:
//                 return "Awaiting Doctor Review";
//             case PatientStatus.AwaitingNextStep:
//                 return "Awaiting Next Step";
//             case PatientStatus.Discharged:
//                 return "Discharged";
//             case PatientStatus.Cancelled:
//                 return "Cancelled";
//             default:
//                 return status;
//         }
//     };

//     return (
//         <Badge variant={getStatusColor(status)} className="text-xs font-semibold">
//             {getStatusLabel(status)}
//         </Badge>
//     );
// }

// /**
//  * ConsultationStatusBadge
//  * Visual indicator for consultation status
//  */
// export function ConsultationStatusBadge({ status, variant = "default" }: StatusBadgeProps) {
//     const getConsultationColor = (status: string): "default" | "secondary" | "destructive" | "outline" => {
//         switch (status) {
//             case "Scheduled":
//                 return "secondary";
//             case "InProgress":
//                 return "default";
//             case "Completed":
//                 return "outline";
//             case "Cancelled":
//                 return "destructive";
//             default:
//                 return "default";
//         }
//     };

//     const getConsultationLabel = (status: string): string => {
//         return status.replace(/([A-Z])/g, " $1").trim();
//     };

//     return (
//         <Badge variant={getConsultationColor(status)} className="text-xs font-semibold">
//             {getConsultationLabel(status)}
//         </Badge>
//     );
// }

// /**
//  * LabRequestStatusBadge
//  * Visual indicator for lab request status
//  */
// export function LabRequestStatusBadge({ status, variant = "default" }: StatusBadgeProps) {
//     const getLabColor = (status: string): "default" | "secondary" | "destructive" | "outline" => {
//         switch (status) {
//             case "Pending":
//                 return "secondary";
//             case "InProgress":
//                 return "default";
//             case "Completed":
//                 return "outline";
//             case "Cancelled":
//                 return "destructive";
//             default:
//                 return "default";
//         }
//     };

//     const getLabLabel = (status: string): string => {
//         return status.replace(/([A-Z])/g, " $1").trim();
//     };

//     return (
//         <Badge variant={getLabColor(status)} className="text-xs font-semibold">
//             {getLabLabel(status)}
//         </Badge>
//     );
// }

// /**
//  * PrescriptionStatusBadge
//  * Visual indicator for prescription status
//  */
// export function PrescriptionStatusBadge({ status, variant = "default" }: StatusBadgeProps) {
//     const getPrescriptionColor = (status: string): "default" | "secondary" | "destructive" | "outline" => {
//         switch (status) {
//             case "Active":
//                 return "default";
//             case "Dispensed":
//                 return "secondary";
//             case "Completed":
//                 return "outline";
//             default:
//                 return "default";
//         }
//     };

//     const getPrescriptionLabel = (status: string): string => {
//         return status;
//     };

//     return (
//         <Badge variant={getPrescriptionColor(status)} className="text-xs font-semibold">
//             {getPrescriptionLabel(status)}
//         </Badge>
//     );
// }

// /**
//  * NursingActionStatusBadge
//  * Visual indicator for nursing action status
//  */
// export function NursingActionStatusBadge({ status, variant = "default" }: StatusBadgeProps) {
//     const getNursingColor = (status: string): "default" | "secondary" | "destructive" | "outline" => {
//         switch (status) {
//             case "Pending":
//                 return "secondary";
//             case "Completed":
//                 return "outline";
//             default:
//                 return "default";
//         }
//     };

//     const getNursingLabel = (status: string): string => {
//         return status;
//     };

//     return (
//         <Badge variant={getNursingColor(status)} className="text-xs font-semibold">
//             {getNursingLabel(status)}
//         </Badge>
//     );
// }

// /**
//  * PaymentStatusBadge
//  * Visual indicator for payment status
//  */
// export function PaymentStatusBadge({ status, variant = "default" }: StatusBadgeProps) {
//     const getPaymentColor = (status: string): "default" | "secondary" | "destructive" | "outline" => {
//         switch (status) {
//             case "Pending":
//                 return "secondary";
//             case "Completed":
//                 return "outline";
//             case "Failed":
//                 return "destructive";
//             case "Refunded":
//                 return "destructive";
//             default:
//                 return "default";
//         }
//     };

//     const getPaymentLabel = (status: string): string => {
//         return status;
//     };

//     return (
//         <Badge variant={getPaymentColor(status)} className="text-xs font-semibold">
//             {getPaymentLabel(status)}
//         </Badge>
//     );
// }
