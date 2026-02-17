"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-provider';
import { UserRole } from '@/types/models';
import {  ShieldCheck, Loader2 } from 'lucide-react';
import Image from 'next/image';

const LoginScreen: React.FC = () => {
    const router = useRouter();
    const { user, login, isLoading: authLoading } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [year, setYear] = useState<number>(new Date().getFullYear());

    useEffect(() => {
        setYear(new Date().getFullYear());
    }, []);

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

    

    const handleSubmitLogin = async () => {
        if (!email || !password || !selectedRole) {
            setError('Please enter email and password');
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const result = await login(email, password);

            if (!result.success) {
                setError(result.message || 'Invalid credentials');
                setLoading(false);
                return;
            }

            // Redirect handled by useEffect
        } catch (err) {
            setError('Login failed. Please try again.');
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

    // if (authLoading) {
    //     return (
    //         <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
    //             <div className="text-center">
    //                 <Loader2 size={40} className="text-blue-600 animate-spin mx-auto mb-4" />
    //                 <p className="text-slate-600">Loading...</p>
    //             </div>
    //         </div>
    //     );
    // }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
            <div className="max-w-2xl w-full">
                {/* Header */}
                <div className="text-center mb-12">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl text-white mb-6 shadow-lg shadow-red-200">
                        <Image
                            src="/assets/icons/nilelogo.jpeg"
                            alt="Logo"
                            width={56}
                            height={56}
                            className="h-14 w-auto drop-shadow-lg"
                            priority
                        />                    </div>
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
                    {!selectedRole ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {roles.map((role) => (
                                <button
                                    key={role.value}
                                    onClick={() => setSelectedRole(role.value)}
                                    className="text-left rounded-xl border border-slate-200 hover:border-red-400 transition-all hover:shadow-lg p-6"
                                >
                                    <div className="font-bold text-lg">{role.label}</div>
                                    <div className="text-sm text-slate-600">{role.description}</div>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="text-center">
                                <h2 className="text-xl font-bold text-slate-900">
                                    Login as {selectedRole}
                                </h2>
                            </div>

                            <div className="space-y-4">
                                <input
                                    type="email"
                                    placeholder="Email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-4 py-3 border rounded-lg"
                                />

                                <input
                                    type="password"
                                    placeholder="Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-3 border rounded-lg"
                                />
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setSelectedRole(null)}
                                    className="flex-1 border border-red-500 rounded-lg py-3"
                                >
                                    Back
                                </button>

                                <button
                                    onClick={handleSubmitLogin}
                                    disabled={loading}
                                    className="flex-1 bg-red-600 text-white rounded-lg py-3"
                                >
                                    {loading ? 'Signing in…' : 'Sign In'}
                                </button>
                            </div>
                        </div>
                    )}


                   
                </div>

                {/* Footer */}
                <p className="text-center text-slate-500 text-sm mt-10">
                    &copy; {year} Nile Valley Mother & Child Hospital. All rights reserved.
                </p>
            </div>
        </div>
    );
};

export default LoginScreen;