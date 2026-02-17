"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/auth-provider";
import { usePendingNursingActions } from "@/hooks/use-emr";
import { getPatientById } from "@/lib/appwrite-service";
import { LoadingSkeleton, EmptyState } from "@/components/emr-ui";
import { Badge } from "@/components/ui/badge";

function NurseTaskList({ actions, patientMap }: { actions: any[]; patientMap: Record<string, any> }) {
    if (!actions || actions.length === 0) {
        return <EmptyState title="No assigned patients" description="You have no nursing tasks assigned right now." />;
    }

    return (
        <div className="space-y-3">
            {actions.map((act) => {
                const patient = patientMap[act.patientId];
                return (
                    <Link key={act.$id} href={`/nurse/task/${act.$id}`} className="block">
                        <div className="border rounded-lg p-4 bg-white hover:shadow-md transition flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">{patient ? patient.name : act.patientId}</h3>
                                <p className="text-sm text-gray-500">{act.actionType || "Care"} • Assigned {new Date(act.$createdAt).toLocaleString()}</p>
                                <p className="text-sm text-gray-700 mt-2">{act.description || "No instructions provided."}</p>
                            </div>
                            <div className="text-right">
                                <Badge className={act.status === "Pending" ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-800"}>
                                    {act.status}
                                </Badge>
                                <p className="text-xs text-gray-500 mt-2">Patient status: {patient ? patient.status : "-"}</p>
                            </div>
                        </div>
                    </Link>
                );
            })}
        </div>
    );
}

const NurseDashboard: React.FC = () => {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const { data: actions, loading, error } = usePendingNursingActions() as any;

    useEffect(() => {
        if (!authLoading && user && user.role !== "Nurse") {
            router.push("/unauthorized");
        }
    }, [user, authLoading, router]);

    const assigned = useMemo(() => {
        if (!actions) return [];
        if (!user) return [];
        return actions.filter((a: any) => a.assignedNurse === user.$id && a.status === "Pending");
    }, [actions, user]);

    // fetch patient details for assigned actions
    const [patientMap, setPatientMap] = useState<Record<string, any>>({});

    useEffect(() => {
        let mounted = true;
        const fetchPatients = async () => {
            const ids = Array.from(new Set(assigned.map((a: any) => a.patientId))) as string[];
            try {
                const results = await Promise.all(ids.map((id) => getPatientById(id).catch(() => null)));
                if (!mounted) return;
                const map: Record<string, any> = {};
                ids.forEach((id, idx) => {
                    map[id] = results[idx];
                });
                setPatientMap(map);
            } catch (e) {
                // ignore, UI will show IDs
            }
        };
        if (assigned.length > 0) fetchPatients();
        return () => {
            mounted = false;
        };
    }, [assigned]);

    if (authLoading || loading) return <LoadingSkeleton />;

    return (
        <div className="min-h-screen p-6 bg-gray-50">
            <div className="max-w-5xl mx-auto">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Nurse Dashboard</h1>
                        <p className="text-sm text-gray-600">Assigned patients and care tasks</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-sm text-gray-700">
                            <div>Pending tasks: <span className="font-semibold">{assigned.length}</span></div>
                        </div>
                        <Link href="/nurse/task/new" className="px-3 py-2 bg-blue-600 text-white rounded">New Task</Link>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                        <h2 className="text-lg font-semibold mb-3">Assigned Patients</h2>
                        <NurseTaskList actions={assigned} patientMap={patientMap} />
                    </div>

                    <aside className="space-y-4">
                        <div className="border rounded-lg p-4 bg-white">
                            <h3 className="font-semibold text-gray-900">Quick Actions</h3>
                            <ul className="mt-3 space-y-2 text-sm text-gray-700">
                                <li><Link href="/nurse/task/new" className="text-blue-600">Create new nursing action</Link></li>
                                <li><Link href="/patient-search" className="text-blue-600">Search patient</Link></li>
                            </ul>
                        </div>

                        <div className="border rounded-lg p-4 bg-white">
                            <h3 className="font-semibold text-gray-900">Help</h3>
                            <p className="text-sm text-gray-600 mt-2">Record vitals and treatment for assigned patients. Completing a task updates patient status to AwaitingNextStep.</p>
                        </div>
                    </aside>
                </div>
            </div>
        </div>
    );
};

export default NurseDashboard;