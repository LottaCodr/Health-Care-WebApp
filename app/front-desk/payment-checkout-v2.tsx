"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/auth-provider";
import { useRoleProtection } from "@/lib/role-utils";
import { UserRole, PatientStatus, Payment } from "@/types/models";
import { usePatientsByStatus, usePaymentsByPatient, useCreatePayment, useUpdatePatientStatus } from "@/hooks/use-emr";
import { PatientInfoCard, PaymentCard, LoadingSkeleton, EmptyState, ErrorAlert, SuccessAlert } from "@/components/emr-ui";

interface PaymentFormData {
    amount: number;
    paymentMethod: "Cash" | "Card" | "Transfer" | "Cheque";
    description: string;
}

/**
 * Payment & Checkout Screen
 * Handles payment processing for patients before discharge
 */
export default function PaymentCheckout() {
    const { user } = useAuth();
    const { authorized } = useRoleProtection([UserRole.FrontDesk, UserRole.Admin]);

    const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
    const [formData, setFormData] = useState<PaymentFormData>({
        amount: 0,
        paymentMethod: "Cash",
        description: "",
    });
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [dismissedErrors, setDismissedErrors] = useState<string[]>([]);

    // Fetch patients awaiting payment
    const awaitingPaymentPatients = usePatientsByStatus(PatientStatus.AwaitingPayment);

    // Fetch payments for selected patient
    const patientPayments = usePaymentsByPatient(selectedPatientId || "");

    // Mutations
    const createPaymentMutation = useCreatePayment();
    const updatePatientStatusMutation = useUpdatePatientStatus();

    if (!authorized) {
        return null;
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: name === "amount" ? parseFloat(value) || 0 : value,
        }));
    };

    const handleSubmitPayment = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedPatientId) {
            alert("Please select a patient");
            return;
        }

        if (formData.amount <= 0) {
            alert("Please enter a valid amount");
            return;
        }

        try {
            const payment = await createPaymentMutation.mutate({
                patientId: selectedPatientId,
                amount: formData.amount,
                paymentMethod: formData.paymentMethod,
                status: "Completed",
                description: formData.description,
                processedBy: user?.$id || "unknown",
                processedDate: new Date().toISOString(),
            });

            // Update patient status to Discharged
            await updatePatientStatusMutation.mutate(selectedPatientId, PatientStatus.Discharged);

            setSuccessMessage("Payment processed successfully! Patient has been discharged.");
            setFormData({
                amount: 0,
                paymentMethod: "Cash",
                description: "",
            });
            setSelectedPatientId(null);

            setTimeout(() => setSuccessMessage(null), 5000);
        } catch (error) {
            console.error("Failed to process payment:", error);
        }
    };

    const selectedPatient = awaitingPaymentPatients.data?.find(
        (p) => p.$id === selectedPatientId
    );

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 py-6">
                    <h1 className="text-3xl font-bold text-gray-900">Payment & Checkout</h1>
                    <p className="text-gray-600 mt-1">Process payments before patient discharge</p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-8">
                {successMessage && (
                    <SuccessAlert
                        message={successMessage}
                        onDismiss={() => setSuccessMessage(null)}
                    />
                )}

                {/* Overview */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-500">
                        <p className="text-gray-600 text-sm font-medium">Awaiting Payment</p>
                        <p className="text-3xl font-bold text-gray-900 mt-2">
                            {awaitingPaymentPatients.data?.length || 0}
                        </p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
                        <p className="text-gray-600 text-sm font-medium">
                            Payments Today
                        </p>
                        <p className="text-3xl font-bold text-gray-900 mt-2">
                            {patientPayments.data?.length || 0}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Patient Selection */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-lg font-bold text-gray-900 mb-4">Select Patient</h2>

                        {awaitingPaymentPatients.loading && <LoadingSkeleton rows={3} />}
                        {awaitingPaymentPatients.error && !dismissedErrors.includes("patients") && (
                            <ErrorAlert
                                error={awaitingPaymentPatients.error}
                                onDismiss={() => setDismissedErrors([...dismissedErrors, "patients"])}
                            />
                        )}

                        {!awaitingPaymentPatients.loading &&
                            awaitingPaymentPatients.data?.length === 0 && (
                                <EmptyState
                                    title="No Pending Payments"
                                    description="All patients have completed payment"
                                    icon="✓"
                                />
                            )}

                        <div className="space-y-2 max-h-96 overflow-y-auto">
                            {awaitingPaymentPatients.data?.map((patient) => (
                                <button
                                    key={patient.$id}
                                    onClick={() => setSelectedPatientId(patient.$id)}
                                    className={`w-full text-left p-3 rounded-lg border transition-all ${selectedPatientId === patient.$id
                                            ? "border-blue-500 bg-blue-50"
                                            : "border-gray-200 hover:border-gray-300"
                                        }`}
                                >
                                    <p className="font-semibold text-gray-900">{patient.name}</p>
                                    <p className="text-xs text-gray-600">{patient.phone}</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Payment Form */}
                    <div className="lg:col-span-2 space-y-8">
                        {selectedPatient && (
                            <>
                                {/* Patient Details */}
                                <div className="bg-white rounded-lg shadow p-6">
                                    <h2 className="text-lg font-bold text-gray-900 mb-4">
                                        Patient Details
                                    </h2>
                                    <PatientInfoCard patient={selectedPatient} />
                                </div>

                                {/* Payment Form */}
                                <div className="bg-white rounded-lg shadow p-6">
                                    <h2 className="text-lg font-bold text-gray-900 mb-4">
                                        Process Payment
                                    </h2>

                                    <form onSubmit={handleSubmitPayment} className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Amount (₦) *
                                            </label>
                                            <input
                                                type="number"
                                                name="amount"
                                                value={formData.amount || ""}
                                                onChange={handleChange}
                                                placeholder="0.00"
                                                step="0.01"
                                                min="0"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Payment Method *
                                            </label>
                                            <select
                                                name="paymentMethod"
                                                value={formData.paymentMethod}
                                                onChange={handleChange}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            >
                                                <option value="Cash">Cash</option>
                                                <option value="Card">Card</option>
                                                <option value="Transfer">Bank Transfer</option>
                                                <option value="Cheque">Cheque</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Description/Notes
                                            </label>
                                            <input
                                                type="text"
                                                name="description"
                                                value={formData.description}
                                                onChange={handleChange}
                                                placeholder="e.g., Consultation fee"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={createPaymentMutation.loading}
                                            className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
                                        >
                                            {createPaymentMutation.loading
                                                ? "Processing..."
                                                : "Complete Payment & Discharge"}
                                        </button>
                                    </form>
                                </div>

                                {/* Payment History */}
                                <div className="bg-white rounded-lg shadow p-6">
                                    <h2 className="text-lg font-bold text-gray-900 mb-4">
                                        Payment History
                                    </h2>

                                    {patientPayments.loading && <LoadingSkeleton rows={2} />}
                                    {patientPayments.error && !dismissedErrors.includes("payments") && (
                                        <ErrorAlert
                                            error={patientPayments.error}
                                            onDismiss={() =>
                                                setDismissedErrors([...dismissedErrors, "payments"])
                                            }
                                        />
                                    )}

                                    {!patientPayments.loading && patientPayments.data?.length === 0 && (
                                        <EmptyState
                                            title="No Payment Records"
                                            description="This patient has not made any payments yet"
                                            icon="💳"
                                        />
                                    )}

                                    <div className="space-y-4">
                                        {patientPayments.data?.map((payment) => (
                                            <PaymentCard key={payment.$id} payment={payment} />
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}

                        {!selectedPatient && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                                <p className="text-blue-800">
                                    Select a patient from the left panel to process their payment
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
