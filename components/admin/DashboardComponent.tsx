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
        <div className="space-y-10">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-4xl font-black tracking-tight text-foreground">Admin Console</h1>
                    <p className="text-muted-foreground font-medium">System monitoring and audit logs</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                <Card className="glass-card">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Patients</CardTitle>
                        <AlertCircle className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalPatients}</div>
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">Registered</p>
                    </CardContent>
                </Card>

                <Card className="glass-card">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Consultations</CardTitle>
                        <Activity className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalConsultations}</div>
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">Completed</p>
                    </CardContent>
                </Card>

                <Card className="glass-card">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Payments</CardTitle>
                        <BarChart3 className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₦{stats.totalPayments}</div>
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">Processed</p>
                    </CardContent>
                </Card>

                <Card className="glass-card">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Audit Events</CardTitle>
                        <Shield className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.auditEventsToday}</div>
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">Today</p>
                    </CardContent>
                </Card>
            </div>

            <div className="glass-card p-8">
                <h2 className="text-2xl font-bold text-foreground mb-8">Recent Activity Logs</h2>
                {loading ? (
                    <LoadingSkeleton />
                ) : auditLogs.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-muted-foreground">No audit logs available</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="border-b border-border">
                                <tr>
                                    <th className="text-left py-4 px-4 font-bold text-muted-foreground uppercase tracking-widest">Timestamp</th>
                                    <th className="text-left py-4 px-4 font-bold text-muted-foreground uppercase tracking-widest">User</th>
                                    <th className="text-left py-4 px-4 font-bold text-muted-foreground uppercase tracking-widest">Action</th>
                                    <th className="text-left py-4 px-4 font-bold text-muted-foreground uppercase tracking-widest">Entity</th>
                                </tr>
                            </thead>
                            <tbody>
                                {auditLogs.map((log: any) => (
                                    <tr key={log.id} className="border-b border-border hover:bg-white/5 transition-colors">
                                        <td className="py-4 px-4 text-muted-foreground">{new Date(log.timestamp).toLocaleString()}</td>
                                        <td className="py-4 px-4 font-bold">{log.userId}</td>
                                        <td className="py-4 px-4">
                                            <span className="px-3 py-1 bg-primary/20 text-primary rounded-full text-[10px] font-black uppercase tracking-widest border border-primary/20">{log.action}</span>
                                        </td>
                                        <td className="py-4 px-4 text-muted-foreground">{log.entityType}: {log.entityId}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
