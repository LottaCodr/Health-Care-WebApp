"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/auth-provider";
import { useRoleProtection, getDashboardRoute } from "@/lib/role-utils";
import { UserRole } from "@/types/models";
import { usePatientsByStatus, usePendingPayments } from "@/hooks/use-emr";
import { PatientStatus } from "@/types/models";
import {
  PatientInfoCard,
  PaymentCard,
  LoadingSkeleton,
  EmptyState,
  ErrorAlert,
} from "@/components/emr-ui";

// Tab navigation component
function TabNavigation({
  tabs,
  activeTab,
  onChange,
}: {
  tabs: { id: string; label: string; badge?: number }[];
  activeTab: string;
  onChange: (tab: string) => void;
}) {
  return (
    <div className="flex border-b border-gray-200 mb-6">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${activeTab === tab.id
              ? "border-blue-500 text-blue-600"
              : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
        >
          {tab.label}
          {tab.badge !== undefined && (
            <span className="ml-2 bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
              {tab.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

/**
 * Front Desk Dashboard
 * Manages patient registration, queue, payments, and discharge
 */
export default function FrontDeskDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const { authorized, loading: protectionLoading } = useRoleProtection([
    UserRole.FrontDesk,
    UserRole.Admin,
  ]);

  const [activeTab, setActiveTab] = useState<string>("registered");
  const [dismissedErrors, setDismissedErrors] = useState<string[]>([]);

  // Fetch patients by status
  const registeredPatients = usePatientsByStatus(PatientStatus.Registered);
  const awaitingConsultationPatients = usePatientsByStatus(
    PatientStatus.AwaitingConsultation
  );
  const awaitingPaymentPatients = usePatientsByStatus(PatientStatus.AwaitingPayment);
  const dischargedPatients = usePatientsByStatus(PatientStatus.Discharged);

  // Fetch pending payments
  const pendingPayments = usePendingPayments();

  if (protectionLoading || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!authorized) {
    return null;
  }

  const tabs = [
    {
      id: "registered",
      label: "Newly Registered",
      badge: registeredPatients.data?.length || 0,
    },
    {
      id: "awaiting-consultation",
      label: "Awaiting Consultation",
      badge: awaitingConsultationPatients.data?.length || 0,
    },
    {
      id: "awaiting-payment",
      label: "Awaiting Payment",
      badge: awaitingPaymentPatients.data?.length || 0,
    },
    {
      id: "discharged",
      label: "Discharged",
      badge: dischargedPatients.data?.length || 0,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Front Desk Dashboard</h1>
              <p className="text-gray-600 mt-1">Welcome, {user?.name || "Staff"}</p>
            </div>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
              + Register New Patient
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
            <p className="text-gray-600 text-sm font-medium">Today&apos;s Registrations</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {registeredPatients.data?.length || 0}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-yellow-500">
            <p className="text-gray-600 text-sm font-medium">Awaiting Consultation</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {awaitingConsultationPatients.data?.length || 0}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-500">
            <p className="text-gray-600 text-sm font-medium">Pending Payments</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {awaitingPaymentPatients.data?.length || 0}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
            <p className="text-gray-600 text-sm font-medium">Discharged Today</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {dischargedPatients.data?.length || 0}
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow p-6">
          <TabNavigation tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

          {/* Tab Content */}
          <div>
            {/* Newly Registered Tab */}
            {activeTab === "registered" && (
              <div>
                {registeredPatients.loading && <LoadingSkeleton rows={3} />}
                {registeredPatients.error && !dismissedErrors.includes("registered") && (
                  <ErrorAlert
                    error={registeredPatients.error}
                    onDismiss={() => setDismissedErrors([...dismissedErrors, "registered"])}
                  />
                )}
                {!registeredPatients.loading && registeredPatients.data?.length === 0 && (
                  <EmptyState
                    title="No Newly Registered Patients"
                    description="All patients have been processed"
                    icon="✓"
                  />
                )}
                <div className="grid gap-4">
                  {registeredPatients.data?.map((patient) => (
                    <div key={patient.$id} className="flex justify-between items-center">
                      <PatientInfoCard patient={patient} />
                      <button className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium whitespace-nowrap">
                        Process
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Awaiting Consultation Tab */}
            {activeTab === "awaiting-consultation" && (
              <div>
                {awaitingConsultationPatients.loading && <LoadingSkeleton rows={3} />}
                {awaitingConsultationPatients.error &&
                  !dismissedErrors.includes("awaiting-consultation") && (
                    <ErrorAlert
                      error={awaitingConsultationPatients.error}
                      onDismiss={() =>
                        setDismissedErrors([...dismissedErrors, "awaiting-consultation"])
                      }
                    />
                  )}
                {!awaitingConsultationPatients.loading &&
                  awaitingConsultationPatients.data?.length === 0 && (
                    <EmptyState
                      title="No Patients Awaiting Consultation"
                      description="All patients are being seen or completed"
                      icon="✓"
                    />
                  )}
                <div className="grid gap-4">
                  {awaitingConsultationPatients.data?.map((patient) => (
                    <PatientInfoCard key={patient.$id} patient={patient} />
                  ))}
                </div>
              </div>
            )}

            {/* Awaiting Payment Tab */}
            {activeTab === "awaiting-payment" && (
              <div>
                {awaitingPaymentPatients.loading && <LoadingSkeleton rows={3} />}
                {awaitingPaymentPatients.error &&
                  !dismissedErrors.includes("awaiting-payment") && (
                    <ErrorAlert
                      error={awaitingPaymentPatients.error}
                      onDismiss={() =>
                        setDismissedErrors([...dismissedErrors, "awaiting-payment"])
                      }
                    />
                  )}
                {!awaitingPaymentPatients.loading &&
                  awaitingPaymentPatients.data?.length === 0 && (
                    <EmptyState
                      title="No Pending Payments"
                      description="All payments have been processed"
                      icon="✓"
                    />
                  )}
                <div className="grid gap-4">
                  {awaitingPaymentPatients.data?.map((patient) => (
                    <div key={patient.$id} className="flex justify-between items-center">
                      <PatientInfoCard patient={patient} />
                      <button className="ml-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium whitespace-nowrap">
                        Process Payment
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Discharged Tab */}
            {activeTab === "discharged" && (
              <div>
                {dischargedPatients.loading && <LoadingSkeleton rows={3} />}
                {dischargedPatients.error && !dismissedErrors.includes("discharged") && (
                  <ErrorAlert
                    error={dischargedPatients.error}
                    onDismiss={() => setDismissedErrors([...dismissedErrors, "discharged"])}
                  />
                )}
                {!dischargedPatients.loading && dischargedPatients.data?.length === 0 && (
                  <EmptyState
                    title="No Discharged Patients"
                    description="Patients discharged today will appear here"
                    icon="✓"
                  />
                )}
                <div className="grid gap-4">
                  {dischargedPatients.data?.map((patient) => (
                    <PatientInfoCard key={patient.$id} patient={patient} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Pending Payments Section */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Pending Payments</h2>
          {pendingPayments.loading && <LoadingSkeleton rows={2} />}
          {pendingPayments.error && (
            <ErrorAlert error={pendingPayments.error} />
          )}
          {!pendingPayments.loading && pendingPayments.data?.length === 0 && (
            <EmptyState
              title="No Pending Payments"
              description="All payments are up to date"
              icon="✓"
            />
          )}
          <div className="grid gap-4">
            {pendingPayments.data?.slice(0, 5).map((payment) => (
              <PaymentCard key={payment.$id} payment={payment} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
