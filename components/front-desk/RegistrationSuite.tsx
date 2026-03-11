"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/auth-provider";
import { useRoleProtection } from "@/lib/role-utils";
import { UserRole, PatientStatus } from "@/types/models";
// Note: Keeping appwrite for now as per current logic, will unify to Supabase in Phase 4
import { createPatient } from "@/lib/supabase-service";
import {
    PatientInfoCard,
    LoadingSkeleton,
    ErrorAlert,
    SuccessAlert,
} from "@/components/emr";

const initialFormData = {
    name: "",
    email: "",
    phone: "",
    gender: "Male" as const,
    dateOfBirth: "",
    address: "",
    city: "",
    state: "",
    bloodGroup: "",
    genotype: "",
    allergies: "",
    medicalHistory: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    emergencyContactRelationship: "",
    notes: "",
};

export default function RegistrationSuite() {
    const { user } = useAuth();
    const { authorized } = useRoleProtection([UserRole.FrontDesk, UserRole.Admin]);

    const [formData, setFormData] = useState(initialFormData);
    const [loading, setLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [error, setError] = useState<Error | null>(null);
    const [currentStep, setCurrentStep] = useState(1);

    if (!authorized) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const newPatient = await createPatient({
                ...formData,
                status: PatientStatus.Registered,
                registration_date: new Date().toISOString(),
                registered_by: user?.id || "unknown",
            });
            setSuccessMessage(`Patient registered successfully! ID: ${newPatient.id}`);
            setFormData(initialFormData);
            setCurrentStep(1);
            setTimeout(() => setSuccessMessage(null), 5000);
        } catch (err) {
            setError(err as Error);
        } finally {
            setLoading(false);
        }
    };

    const renderStep = () => {
        switch (currentStep) {
            case 1:
                return (
                    <div className="space-y-4">
                        <h3 className="text-xl font-bold text-gray-800">Basic Information</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <input name="name" value={formData.name} onChange={handleChange} placeholder="Full Name" className="p-2 border rounded-lg" required />
                            <select name="gender" value={formData.gender} onChange={handleChange} className="p-2 border rounded-lg">
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other</option>
                            </select>
                            <input name="email" value={formData.email} onChange={handleChange} placeholder="Email" className="p-2 border rounded-lg" required />
                            <input name="phone" value={formData.phone} onChange={handleChange} placeholder="Phone" className="p-2 border rounded-lg" required />
                            <input type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange} className="p-2 border rounded-lg" required />
                        </div>
                    </div>
                );
            case 2:
                return (
                    <div className="space-y-4">
                        <h3 className="text-xl font-bold text-gray-800">Medical & Contact Info</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <select name="bloodGroup" value={formData.bloodGroup} onChange={handleChange} className="p-2 border rounded-lg">
                                <option value="">Blood Group</option>
                                <option value="O+">O+</option>
                                <option value="A+">A+</option>
                                <option value="B+">B+</option>
                                <option value="AB+">AB+</option>
                            </select>
                            <input name="emergencyContactName" value={formData.emergencyContactName} onChange={handleChange} placeholder="Emergency Contact" className="p-2 border rounded-lg" />
                        </div>
                        <textarea name="medicalHistory" value={formData.medicalHistory} onChange={handleChange} placeholder="Medical History" className="w-full p-2 border rounded-lg" rows={3} />
                    </div>
                );
            default: return null;
        }
    };

    return (
        <div className="w-full max-w-2xl mx-auto">
            <form onSubmit={handleSubmit} className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 space-y-6">
                {successMessage && <SuccessAlert message={successMessage} />}
                {error && <ErrorAlert error={error} />}
                {renderStep()}
                <div className="flex justify-between pt-4 border-t">
                    <button type="button" onClick={() => setCurrentStep(p => Math.max(1, p - 1))} className={`px-4 py-2 rounded-lg ${currentStep === 1 ? "hidden" : "bg-gray-100"}`}>Back</button>
                    {currentStep < 2 ? (
                        <button type="button" onClick={() => setCurrentStep(2)} className="ml-auto px-6 py-2 bg-blue-600 text-white rounded-lg">Next</button>
                    ) : (
                        <button type="submit" disabled={loading} className="ml-auto px-6 py-2 bg-green-600 text-white rounded-lg">{loading ? "Registering..." : "Register Patient"}</button>
                    )}
                </div>
            </form>
        </div>
    );
}
