"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/auth-provider";
import { useRoleProtection } from "@/lib/role-utils";
import { UserRole } from "@/types/models";
import { usePendingLabRequests } from "@/hooks/use-emr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    LoadingSkeleton,
    EmptyState,
    ErrorAlert,
} from "@/components/emr-ui";
import Link from "next/link";
import { Beaker, CheckCircle2, Clock } from "lucide-react";

interface TestSummary {
    pending: number;
    completed: number;
    urgent: number;
}

export default function LabTechDashboard() {
    const { user, loading: authLoading } = useAuth();
    const { authorized, loading: roleLoading } = useRoleProtection([UserRole.LabTechnician, UserRole.Admin]);
    const { data: pendingRequests, loading, error } = usePendingLabRequests();

    const [testSummary, setTestSummary] = useState<TestSummary>({
        pending: 0,
        completed: 0,
        urgent: 0,
    });

    const [filteredTests, setFilteredTests] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState("pending");

    useEffect(() => {
        if (pendingRequests) {
            const pending = pendingRequests.filter((r) => r.status === "Pending");
            const completed = pendingRequests.filter((r) => r.status === "Completed");
            const urgent = pendingRequests.filter((r) => r.priority === "Urgent");

            setTestSummary({
                pending: pending.length,
                completed: completed.length,
                urgent: urgent.length,
            });

            if (activeTab === "pending") {
                setFilteredTests(pending);
            } else if (activeTab === "urgent") {
                setFilteredTests(urgent);
            } else {
                setFilteredTests(completed);
            }
        }
    }, [pendingRequests, activeTab]);

    if (authLoading || roleLoading) return <LoadingSkeleton />;

    if (!authorized) {
        return <ErrorAlert message="Unauthorized access. Lab Technicians only." />;
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-gray-900">Lab Technician Dashboard</h1>
                    <p className="text-gray-600 mt-2">Manage laboratory test requests</p>
                </div>

                {/* Statistics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Pending Tests</CardTitle>
                            <Clock className="h-4 w-4 text-yellow-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{testSummary.pending}</div>
                            <p className="text-xs text-gray-600">Awaiting results</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Completed</CardTitle>
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{testSummary.completed}</div>
                            <p className="text-xs text-gray-600">Results submitted</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Urgent</CardTitle>
                            <Beaker className="h-4 w-4 text-red-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{testSummary.urgent}</div>
                            <p className="text-xs text-gray-600">Priority tests</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Test Queue */}
                <Card>
                    <CardHeader>
                        <CardTitle>Test Queue</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Tabs value={activeTab} onValueChange={setActiveTab}>
                            <TabsList>
                                <TabsTrigger value="pending">Pending</TabsTrigger>
                                <TabsTrigger value="urgent">Urgent</TabsTrigger>
                                <TabsTrigger value="completed">Completed</TabsTrigger>
                            </TabsList>

                            <TabsContent value={activeTab} className="mt-6">
                                {error && <ErrorAlert message={error.message} />}

                                {loading && <LoadingSkeleton />}

                                {!loading && !error && filteredTests.length === 0 && (
                                    <EmptyState
                                        title="No tests"
                                        description={`No ${activeTab} tests at the moment`}
                                    />
                                )}

                                {!loading && filteredTests.length > 0 && (
                                    <div className="space-y-4">
                                        {filteredTests.map((test) => (
                                            <Link
                                                key={test.$id}
                                                href={`/lab-tech/test/${test.$id}`}
                                            >
                                                <div className="p-4 border border-gray-200 rounded-lg hover:bg-blue-50 cursor-pointer transition">
                                                    <div className="flex items-start justify-between">
                                                        <div>
                                                            <h3 className="font-semibold text-gray-900">
                                                                {test.testType}
                                                            </h3>
                                                            <p className="text-sm text-gray-600 mt-1">
                                                                Patient ID: {test.patientId}
                                                            </p>
                                                            <p className="text-sm text-gray-500 mt-2">
                                                                {test.testDescription}
                                                            </p>
                                                        </div>
                                                        <div className="text-right">
                                                            <span
                                                                className={`px-3 py-1 rounded-full text-xs font-medium ${test.status === "Pending"
                                                                    ? "bg-yellow-100 text-yellow-800"
                                                                    : test.status === "InProgress"
                                                                        ? "bg-blue-100 text-blue-800"
                                                                        : "bg-green-100 text-green-800"
                                                                    }`}
                                                            >
                                                                {test.status}
                                                            </span>
                                                            {test.priority === "Urgent" && (
                                                                <div className="mt-2 px-2 py-1 bg-red-100 text-red-700 text-xs rounded font-medium">
                                                                    ⚠ Urgent
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
