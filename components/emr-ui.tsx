/**
 * Reusable UI Components for Hospital EMR
 * Common components used across multiple roles
 */

import React from "react";
import { Patient, PatientStatus, Consultation, Payment } from "@/types/models";
import { Badge } from "@/components/ui/badge";

/**
 * Patient Information Card
 * Displays key patient details
 */
export function PatientInfoCard({ patient }: { patient: Patient }) {

  const getStatusColor = (status: PatientStatus) => {
    const colors: Record<PatientStatus, string> = {
      [PatientStatus.Registered]: "bg-blue-100 text-blue-800",
      [PatientStatus.AwaitingConsultation]: "bg-yellow-100 text-yellow-800",
      [PatientStatus.UnderConsultation]: "bg-purple-100 text-purple-800",
      [PatientStatus.SentToNurse]: "bg-green-100 text-green-800",
      [PatientStatus.SentToLab]: "bg-orange-100 text-orange-800",
      [PatientStatus.SentToPharmacy]: "bg-indigo-100 text-indigo-800",
      [PatientStatus.AwaitingPayment]: "bg-red-100 text-red-800",
      [PatientStatus.Discharged]: "bg-gray-100 text-gray-800",
      [PatientStatus.Cancelled]: "bg-red-100 text-red-800",
      [PatientStatus.AwaitingDoctorReview]: "bg-cyan-100 text-cyan-800",
      [PatientStatus.AwaitingNextStep]: "bg-teal-100 text-teal-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{patient.name}</h3>
          <p className="text-sm text-gray-500">ID: {patient.$id}</p>
        </div>
        <Badge className={`${getStatusColor(patient.status)}`}>
          {patient.status}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-gray-500">Email</p>
          <p className="text-sm font-medium text-gray-900">{patient.email}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Phone</p>
          <p className="text-sm font-medium text-gray-900">{patient.phone}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Gender</p>
          <p className="text-sm font-medium text-gray-900">{patient.gender}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Blood Group</p>
          <p className="text-sm font-medium text-gray-900">{patient.bloodGroup}</p>
        </div>
        <div className="col-span-2">
          <p className="text-xs text-gray-500">Address</p>
          <p className="text-sm font-medium text-gray-900">{patient.address}</p>
        </div>
        {patient.allergies && (
          <div className="col-span-2">
            <p className="text-xs text-gray-500">Allergies</p>
            <p className="text-sm font-medium text-red-600">{patient.allergies}</p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Consultation Card
 * Displays consultation details
 */
export function ConsultationCard({ consultation }: { consultation: Consultation }) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Completed":
        return "✓";
      case "InProgress":
        return "◐";
      case "Scheduled":
        return "↓";
      default:
        return "○";
    }
  };

  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h4 className="font-semibold text-gray-900">
            Consultation #{consultation.$id.substring(0, 8)}
          </h4>
          <p className="text-xs text-gray-500">
            {new Date(consultation.startTime).toLocaleString()}
          </p>
        </div>
        <Badge variant="outline">{consultation.status}</Badge>
      </div>

      <div className="space-y-2 text-sm">
        <div>
          <p className="text-xs text-gray-500">Symptoms</p>
          <p className="text-gray-900">{consultation.symptoms}</p>
        </div>
        {consultation.diagnosis && (
          <div>
            <p className="text-xs text-gray-500">Diagnosis</p>
            <p className="text-gray-900">{consultation.diagnosis}</p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Payment Status Card
 * Displays payment information
 */
export function PaymentCard({ payment }: { payment: Payment }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed":
        return "text-green-600";
      case "Pending":
        return "text-yellow-600";
      case "Failed":
        return "text-red-600";
      case "Refunded":
        return "text-blue-600";
      default:
        return "text-gray-600";
    }
  };

  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h4 className="font-semibold text-gray-900">
            ₦{payment.amount.toLocaleString()}
          </h4>
          <p className="text-xs text-gray-500">
            {new Date(payment.processedDate).toLocaleDateString()}
          </p>
        </div>
        <Badge className={getStatusColor(payment.status)}>
          {payment.status}
        </Badge>
      </div>

      <div className="space-y-1 text-sm text-gray-700">
        <p>
          <span className="text-gray-500">Method:</span> {payment.paymentMethod}
        </p>
        <p>
          <span className="text-gray-500">Description:</span> {payment.description}
        </p>
      </div>
    </div>
  );
}

/**
 * Loading Skeleton
 * Generic loading state component
 */
export function LoadingSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="border rounded-lg p-4 bg-white animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Empty State
 * Displayed when no data is available
 */
export function EmptyState({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {icon && <div className="mb-4 text-4xl">{icon}</div>}
      <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}

/**
 * Error Alert
 * Displays error messages
 */
export function ErrorAlert({ error, message, onDismiss }: { error?: Error; message?: string; onDismiss?: () => void }) {
  const displayMessage = message || (error ? error.message : "An error occurred");
  return (
    <div className="rounded-lg bg-red-50 border border-red-200 p-4 mb-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-red-900">Error</h3>
          <p className="text-sm text-red-700 mt-1">{displayMessage}</p>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-red-500 hover:text-red-700 text-xl font-bold"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Success Alert
 * Displays success messages
 */
export function SuccessAlert({ message, onDismiss }: { message: string; onDismiss?: () => void }) {
  return (
    <div className="rounded-lg bg-green-50 border border-green-200 p-4 mb-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-green-900">Success</h3>
          <p className="text-sm text-green-700 mt-1">{message}</p>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-green-500 hover:text-green-700 text-xl font-bold"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}
