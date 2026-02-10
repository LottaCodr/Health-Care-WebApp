"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePendingLabRequests } from '@/hooks/use-emr';
import { getPatientById } from '@/lib/appwrite-service';
import { LoadingSkeleton, EmptyState } from '@/components/emr-ui';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/auth-provider';

const PendingTestRequestsScreen: React.FC = () => {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const { data: requests, loading, error, refetch } = usePendingLabRequests() as any;

    const [patientMap, setPatientMap] = useState<Record<string, any>>({});

    useEffect(() => {
        if (!authLoading && user && user.role !== 'LAB_TECHNICIAN') {
            router.push('/unauthorized');
        }
    }, [user, authLoading, router]);

    useEffect(() => {
        let mounted = true;
        const fetchPatients = async () => {
            if (!requests || requests.length === 0) return;
            const ids: string[] = Array.from(new Set(requests.map((r: any) => String(r.patientId))));
            try {
                const results = await Promise.all((ids as string[]).map((id: string) => getPatientById(id).catch(() => null as any)));
                if (!mounted) return;
                const map: Record<string, any> = {};
                ids.forEach((id, idx) => (map[String(id)] = results[idx]));
                setPatientMap(map);
            } catch (e) {
                // ignore
            }
        };
        fetchPatients();
        return () => {
            mounted = false;
        };
    }, [requests]);

    if (authLoading || loading) return <LoadingSkeleton />;

    const assigned = (requests || []).filter((r: any) => r.assignedTo === user?.$id && r.status === 'Pending');

    if (!assigned || assigned.length === 0) {
        return <EmptyState title="No pending test requests" description="You have no pending lab tests assigned." />;
    }

    return (
        <div className="min-h-screen p-6 bg-gray-50">
            <div className="max-w-4xl mx-auto">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Pending Test Requests</h1>
                        <p className="text-sm text-gray-600">Tests assigned to you</p>
                    </div>
                    <button onClick={() => refetch && refetch()} className="px-3 py-2 bg-gray-100 rounded">Refresh</button>
                </div>

                <div className="space-y-3">
                    {assigned.map((r: any) => {
                        const patient = patientMap[r.patientId];
                        return (
                            <Link key={r.$id} href={`/lab-tech/test/${r.$id}`} className="block">
                                <div className="border rounded-lg p-4 bg-white hover:shadow transition flex justify-between items-center">
                                    <div>
                                        <h3 className="text-lg font-semibold">{patient ? patient.name : r.patientId}</h3>
                                        <p className="text-sm text-gray-500">{r.testType} • Requested {new Date(r.requestDate || r.$createdAt).toLocaleString()}</p>
                                        <p className="text-sm text-gray-700 mt-2">{r.testDescription}</p>
                                    </div>
                                    <div className="text-right">
                                        <Badge className={r.priority === 'Urgent' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}>{r.priority}</Badge>
                                        <p className="text-xs text-gray-500 mt-2">Status: {r.status}</p>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default PendingTestRequestsScreen;