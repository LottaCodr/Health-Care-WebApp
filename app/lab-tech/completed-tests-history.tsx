"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/auth-provider';
import { useCompletedLabRequests } from '@/hooks/use-emr';
import { getPatientById } from '@/lib/appwrite-service';
import { LoadingSkeleton, EmptyState } from '@/components/emr-ui';
import { Badge } from '@/components/ui/badge';

const CompletedTestsHistoryScreen: React.FC = () => {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const { data: requests, loading, error, refetch } = useCompletedLabRequests() as any;

    const [patientMap, setPatientMap] = useState<Record<string, any>>({});

    useEffect(() => {
        if (!authLoading && user && user.role !== 'LabTechnician' && user.role !== 'Lab Technician') {
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

    const mine = (requests || []).filter((r: any) => r.assignedTo === user?.$id && r.status === 'Completed');

    if (!mine || mine.length === 0) {
        return <EmptyState title="No completed tests" description="You have not completed any tests yet." />;
    }

    return (
        <div className="min-h-screen p-6 bg-gray-50">
            <div className="max-w-4xl mx-auto">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Completed Tests History</h1>
                        <p className="text-sm text-gray-600">Recently completed tests assigned to you</p>
                    </div>
                    <button onClick={() => refetch && refetch()} className="px-3 py-2 bg-gray-100 rounded">Refresh</button>
                </div>

                <div className="space-y-3">
                    {mine.map((r: any) => {
                        const patient = patientMap[r.patientId];
                        return (
                            <div key={r.$id} className="border rounded-lg p-4 bg-white">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-lg font-semibold">{patient ? patient.name : r.patientId}</h3>
                                        <p className="text-sm text-gray-500">{r.testType} • Completed {new Date(r.completionDate || r.$updatedAt).toLocaleString()}</p>
                                        <p className="text-sm text-gray-700 mt-2">{r.results ? r.results.substring(0, 200) : 'No result summary available.'}</p>
                                    </div>
                                    <div className="text-right">
                                        <Badge className="bg-green-100 text-green-800">Completed</Badge>
                                        <Link href={`/lab-tech/test/${r.$id}`} className="block mt-2 text-sm text-blue-600">View</Link>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default CompletedTestsHistoryScreen;