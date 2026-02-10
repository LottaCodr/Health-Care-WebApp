"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-provider';
import { UserRole } from '@/types/models';
import { Stethoscope, ShieldCheck, Loader2 } from 'lucide-react';

const LoginScreen: React.FC = () => {
    const router = useRouter();
    const { user, login, isLoading: authLoading } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Demo credentials for each role
    const demoCredentials: Record<string, { email: string; password: string; role: UserRole }> = {
        [UserRole.FrontDesk]: {
            email: 'frontdesk@hospital.local',
            password: 'demo123456',
            role: UserRole.FrontDesk,
        },
        [UserRole.Doctor]: {
            email: 'doctor@hospital.local',
            password: 'demo123456',
            role: UserRole.Doctor,
        },
        [UserRole.Nurse]: {
            email: 'nurse@hospital.local',
            password: 'demo123456',
            role: UserRole.Nurse,
        },
        [UserRole.LabTechnician]: {
            email: 'labtech@hospital.local',
            password: 'demo123456',
            role: UserRole.LabTechnician,
        },
        [UserRole.Pharmacist]: {
            email: 'pharmacist@hospital.local',
            password: 'demo123456',
            role: UserRole.Pharmacist,
        },
        [UserRole.Admin]: {
            email: 'admin@hospital.local',
            password: 'demo123456',
            role: UserRole.Admin,
        },
    };

    // Dashboard routes by role
    const getDashboardRoute = (role?: string): string => {
        const roleMap: Record<string, string> = {
            [UserRole.Doctor]: '/doctor/dashboard',
            [UserRole.Nurse]: '/nurse/dashboard',
            [UserRole.Pharmacist]: '/pharmacist/dashboard',
            [UserRole.LabTechnician]: '/labtech/dashboard',
            [UserRole.FrontDesk]: '/frontdesk/dashboard',
            [UserRole.Admin]: '/admin/dashboard',
        };
        return roleMap[role || ''] || '/dashboard';
    };

    useEffect(() => {
        if (user && !authLoading) {
            const dashboardRoute = getDashboardRoute(user.role);
            router.push(dashboardRoute);
        }
    }, [user, authLoading, router]);

    const handleLogin = async (role: UserRole) => {
        try {
            setLoading(true);
            setError(null);

            const creds = demoCredentials[role];
            if (!creds) {
                setError('Invalid role selected');
                setLoading(false);
                return;
            }

            // Call login with email and password
            const result = await login(creds.email, creds.password);

            if (!result.success) {
                setError(result.message || 'Login failed');
                setLoading(false);
                return;
            }

            // Navigation will be handled by useEffect when user updates
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
            console.error('Login error:', err);
            setLoading(false);
        }
    };

    const roles = [
        { value: UserRole.FrontDesk, label: 'Front Desk', description: 'Patient registration & queue management', color: 'from-emerald-500 to-emerald-600' },
        { value: UserRole.Doctor, label: 'Doctor', description: 'Patient consultation & diagnosis', color: 'from-blue-500 to-blue-600' },
        { value: UserRole.Nurse, label: 'Nurse', description: 'Vital signs & nursing care', color: 'from-rose-500 to-rose-600' },
        { value: UserRole.LabTechnician, label: 'Lab Technician', description: 'Lab tests & results', color: 'from-purple-500 to-purple-600' },
        { value: UserRole.Pharmacist, label: 'Pharmacist', description: 'Medication dispensing', color: 'from-amber-500 to-amber-600' },
        { value: UserRole.Admin, label: 'Admin', description: 'System administration', color: 'from-slate-600 to-slate-700' },
    ];

    if (authLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 size={40} className="text-blue-600 animate-spin mx-auto mb-4" />
                    <p className="text-slate-600">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
            <div className="max-w-2xl w-full">
                {/* Header */}
                <div className="text-center mb-12">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 text-white mb-6 shadow-lg shadow-blue-200">
                        <Stethoscope size={40} />
                    </div>
                    <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Nile Mother & Child hospital</h1>
                    <p className="text-slate-600 mt-2 text-lg">Nile Valley Hospital EMR System</p>
                </div>

                {/* Card */}
                <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-10">
                    {/* Info Banner */}
                    <div className="flex items-center gap-3 mb-8 p-4 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg">
                        <ShieldCheck size={20} />
                        <span className="text-sm font-medium">Select your role to access the system</span>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="mb-8 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                            <strong>Error:</strong> {error}
                        </div>
                    )}

                    {/* Role Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {roles.map((role) => (
                            <button
                                key={role.value}
                                onClick={() => handleLogin(role.value)}
                                disabled={loading}
                                className="text-left group relative overflow-hidden rounded-xl border border-slate-200 hover:border-blue-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-lg"
                            >
                                {/* Background gradient on hover */}
                                <div className={`absolute inset-0 bg-gradient-to-br ${role.color} opacity-0 group-hover:opacity-5 transition-opacity`} />

                                {/* Content */}
                                <div className="relative p-6">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="font-bold text-slate-900 group-hover:text-blue-700 text-lg">{role.label}</div>
                                            <div className="text-sm text-slate-600 mt-1">{role.description}</div>
                                        </div>
                                        {loading ? (
                                            <Loader2 size={20} className="text-slate-400 animate-spin ml-4 flex-shrink-0" />
                                        ) : (
                                            <div className="text-slate-300 group-hover:text-blue-500 ml-4 flex-shrink-0">
                                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                                </svg>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>

                    {/* Demo Info */}
                    <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                        <p className="text-sm text-amber-900">
                            <strong>Demo Mode:</strong> All demo accounts use password: <code className="bg-amber-100 px-2 py-1 rounded">demo123456</code>
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <p className="text-center text-slate-500 text-sm mt-10">
                    &copy; 2026 Nile Valley Mother & Child Hospital. All rights reserved.
                </p>
            </div>
        </div>
    );
};

export default LoginScreen;