"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/auth-provider";
import { useRoleProtection } from "@/lib/role-utils";
import { UserRole } from "@/types/models";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSkeleton, ErrorAlert } from "@/components/emr-ui";
import { AlertCircle, Shield, Activity, BarChart3 } from "lucide-react";

export default function AdminDashboard() {
    const { user, loading: authLoading } = useAuth();
    const { authorized, loading: roleLoading } = useRoleProtection([UserRole.Admin]);

    const [auditLogs, setAuditLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalPatients: 0,
        totalConsultations: 0,
        totalPayments: 0,
        auditEventsToday: 0,
    });

    useEffect(() => {
        // In production, fetch from service
        setLoading(false);
        setAuditLogs([]);
    }, []);

    if (authLoading || roleLoading) return <LoadingSkeleton />;

    if (!authorized) {
        return <ErrorAlert message="Unauthorized. Admins only." />;
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-gray-900">Admin Dashboard</h1>
                    <p className="text-gray-600 mt-2">System monitoring and audit logs</p>
                </div>

                {/* Statistics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Patients</CardTitle>
                            <AlertCircle className="h-4 w-4 text-blue-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.totalPatients}</div>
                            <p className="text-xs text-gray-600">Registered in system</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Consultations</CardTitle>
                            <Activity className="h-4 w-4 text-green-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.totalConsultations}</div>
                            <p className="text-xs text-gray-600">Completed</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Payments</CardTitle>
                            <BarChart3 className="h-4 w-4 text-orange-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">₦{stats.totalPayments}</div>
                            <p className="text-xs text-gray-600">Processed</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Audit Events</CardTitle>
                            <Shield className="h-4 w-4 text-red-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.auditEventsToday}</div>
                            <p className="text-xs text-gray-600">Today</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Audit Logs */}
                <Card>
                    <CardHeader>
                        <CardTitle>Recent Activity Logs</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <LoadingSkeleton />
                        ) : auditLogs.length === 0 ? (
                            <div className="text-center py-8">
                                <p className="text-gray-500">No audit logs available</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="border-b border-gray-200">
                                        <tr>
                                            <th className="text-left py-3 px-4 font-semibold text-gray-700">
                                                Timestamp
                                            </th>
                                            <th className="text-left py-3 px-4 font-semibold text-gray-700">
                                                User
                                            </th>
                                            <th className="text-left py-3 px-4 font-semibold text-gray-700">
                                                Action
                                            </th>
                                            <th className="text-left py-3 px-4 font-semibold text-gray-700">
                                                Entity
                                            </th>
                                            <th className="text-left py-3 px-4 font-semibold text-gray-700">
                                                Status
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {auditLogs.map((log: any) => (
                                            <tr key={log.$id} className="border-b border-gray-200 hover:bg-gray-50">
                                                <td className="py-3 px-4 text-gray-600">
                                                    {new Date(log.timestamp).toLocaleString()}
                                                </td>
                                                <td className="py-3 px-4 text-gray-900 font-medium">{log.userId}</td>
                                                <td className="py-3 px-4">
                                                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                                                        {log.action}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-gray-600">
                                                    {log.entityType}: {log.entityId}
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                                                        Logged
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Access Control Rules */}
                <Card className="mt-8">
                    <CardHeader>
                        <CardTitle>Access Control Configuration</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                <h4 className="font-semibold text-blue-900 mb-2">Role-Based Permissions Enforced</h4>
                                <ul className="text-sm text-blue-800 space-y-1">
                                    <li>✓ Front Desk: Patient registration, queue management, payments</li>
                                    <li>✓ Doctors: Consultations, prescriptions, lab requests</li>
                                    <li>✓ Nurses: Nursing actions, vitals recording</li>
                                    <li>✓ Lab Techs: Lab test execution, result submission</li>
                                    <li>✓ Pharmacists: Prescription dispensing</li>
                                </ul>
                            </div>

                            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                                <h4 className="font-semibold text-green-900 mb-2">Document-Level Security</h4>
                                <p className="text-sm text-green-800">
                                    Users can only access documents assigned to their role. Server-side validation enforced on all operations.
                                </p>
                            </div>

                            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                                <h4 className="font-semibold text-orange-900 mb-2">Audit Trail Active</h4>
                                <p className="text-sm text-orange-800">
                                    All critical actions logged: patient registration, consultations, lab results, medication dispensing, payments.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
