"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/auth-provider";
import { useRoleProtection } from "@/lib/role-utils";
import { UserRole, PatientStatus } from "@/types/models";
import { usePatientsByStatus, usePaymentsByPatient, useCreatePayment, useUpdatePatientStatus } from "@/hooks/use-emr";
import { PatientInfoCard, PaymentCard, LoadingSkeleton, EmptyState, ErrorAlert, SuccessAlert } from "@/components/emr";

export default function PaymentSuite() {
    const { user } = useAuth();
    const { authorized } = useRoleProtection([UserRole.FrontDesk, UserRole.Admin]);

    const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        amount: 0,
        paymentMethod: "Cash" as "Cash" | "Card" | "Transfer" | "Cheque",
        description: "",
    });
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const awaitingPaymentPatients = usePatientsByStatus(PatientStatus.AwaitingPayment);
    const patientPayments = usePaymentsByPatient(selectedPatientId || "");
    const createPaymentMutation = useCreatePayment();
    const updatePatientStatusMutation = useUpdatePatientStatus();

    if (!authorized) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPatientId || formData.amount <= 0) return;
        try {
            await createPaymentMutation.mutate({
                patientId: selectedPatientId,
                amount: formData.amount,
                paymentMethod: formData.paymentMethod,
                status: "Completed",
                description: formData.description,
                processedBy: user?.$id || "unknown",
                processedDate: new Date().toISOString(),
            });
            await updatePatientStatusMutation.mutate(selectedPatientId, PatientStatus.Discharged);
            setSuccessMessage("Payment processed and patient discharged.");
            setFormData({ amount: 0, paymentMethod: "Cash", description: "" });
            setSelectedPatientId(null);
            setTimeout(() => setSuccessMessage(null), 5000);
        } catch (error) {
            console.error(error);
        }
    };

    const selectedPatient = awaitingPaymentPatients.data?.find(p => p.$id === selectedPatientId);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-4">Awaiting Payment</h3>
                {awaitingPaymentPatients.loading && <LoadingSkeleton rows={4} />}
                <div className="space-y-2 overflow-y-auto max-h-[500px]">
                    {awaitingPaymentPatients.data?.map(p => (
                        <button key={p.$id} onClick={() => setSelectedPatientId(p.$id)} className={`w-full text-left p-4 rounded-2xl border transition-all ${selectedPatientId === p.$id ? "border-blue-500 bg-blue-50" : "border-gray-100 hover:border-gray-200"}`}>
                            <p className="font-bold text-gray-900">{p.name}</p>
                            <p className="text-xs text-gray-500">{p.phone}</p>
                        </button>
                    ))}
                </div>
            </div>

            <div className="lg:col-span-2 space-y-6">
                {successMessage && <SuccessAlert message={successMessage} />}
                {selectedPatient ? (
                    <>
                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                            <h3 className="text-xl font-bold text-gray-800 mb-4">Patient Overview</h3>
                            <PatientInfoCard patient={selectedPatient} />
                        </div>
                        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4">
                            <h3 className="text-xl font-bold text-gray-800 mb-2">Process Transaction</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <input type="number" placeholder="Amount" value={formData.amount || ""} onChange={e => setFormData(p => ({ ...p, amount: parseFloat(e.target.value) }))} className="p-3 border rounded-xl" required />
                                <select value={formData.paymentMethod} onChange={e => setFormData(p => ({ ...p, paymentMethod: e.target.value as any }))} className="p-3 border rounded-xl">
                                    <option value="Cash">Cash</option>
                                    <option value="Card">Card</option>
                                    <option value="Transfer">Transfer</option>
                                </select>
                            </div>
                            <button type="submit" disabled={createPaymentMutation.loading} className="w-full py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 shadow-lg shadow-green-100">
                                {createPaymentMutation.loading ? "Processing..." : "Complete Checkout"}
                            </button>
                        </form>
                    </>
                ) : (
                    <div className="p-8 text-center bg-blue-50 rounded-3xl border border-blue-100 text-blue-800 font-medium">
                        Select a patient to begin checkout
                    </div>
                )}
            </div>
        </div>
    );
}
