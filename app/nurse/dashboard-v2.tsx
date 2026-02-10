"use client";

import { useState, useEffect } from "react";
import { useRoleProtection } from "@/lib/role-utils";
import { UserRole } from "@/types/models";
import { usePendingNursingActions } from "@/hooks/use-emr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    LoadingSkeleton,
    EmptyState,
    ErrorAlert,
} from "@/components/emr-ui";
import Link from "next/link";
import { CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { useAuth } from "@/context/auth-provider";

interface TaskSummary {
    pending: number;
    inProgress: number;
    completed: number;
}

export default function NurseDashboard() {
    const { user } = useAuth();
    const { authorized, loading: roleLoading } = useRoleProtection([UserRole.Nurse, UserRole.Admin]);
    const { data: pendingActions, loading, error } = usePendingNursingActions();

    const [taskSummary, setTaskSummary] = useState<TaskSummary>({
        pending: 0,
        inProgress: 0,
        completed: 0,
    });

    const [filteredTasks, setFilteredTasks] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState("pending");

    useEffect(() => {
        if (pendingActions) {
            const pending = pendingActions.filter((a) => a.status === "Pending");
            const inProgress = pendingActions.filter((a) => a.status === "InProgress");
            const completed = pendingActions.filter((a) => a.status === "Completed");

            setTaskSummary({
                pending: pending.length,
                inProgress: inProgress.length,
                completed: completed.length,
            });

            if (activeTab === "pending") {
                setFilteredTasks(pending);
            } else if (activeTab === "in-progress") {
                setFilteredTasks(inProgress);
            } else {
                setFilteredTasks(completed);
            }
        }
    }, [pendingActions, activeTab]);

    if (roleLoading) return <LoadingSkeleton />;

    if (!authorized) {
        return <ErrorAlert error={new Error("Unauthorized access. Nurses only.")} />;
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-gray-900">Nursing Dashboard</h1>
                    <p className="text-gray-600 mt-2">Manage patient care activities</p>
                </div>

                {/* Statistics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
                            <AlertCircle className="h-4 w-4 text-yellow-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{taskSummary.pending}</div>
                            <p className="text-xs text-gray-600">Awaiting action</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
                            <Clock className="h-4 w-4 text-blue-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{taskSummary.inProgress}</div>
                            <p className="text-xs text-gray-600">Being attended</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{taskSummary.completed}</div>
                            <p className="text-xs text-gray-600">Finished tasks</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Tasks Tabs */}
                <Card>
                    <CardHeader>
                        <CardTitle>Nursing Tasks</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Tabs value={activeTab} onValueChange={setActiveTab}>
                            <TabsList>
                                <TabsTrigger value="pending">Pending</TabsTrigger>
                                <TabsTrigger value="in-progress">In Progress</TabsTrigger>
                                <TabsTrigger value="completed">Completed</TabsTrigger>
                            </TabsList>

                            <TabsContent value={activeTab} className="mt-6">
                                {error && <ErrorAlert error={error instanceof Error ? error : new Error(String(error))} />}

                                {loading && <LoadingSkeleton />}

                                {!loading && !error && filteredTasks.length === 0 && (
                                    <EmptyState
                                        title="No tasks"
                                        description={`No ${activeTab.replace("-", " ")} tasks at the moment`}
                                    />
                                )}

                                {!loading && filteredTasks.length > 0 && (
                                    <div className="space-y-4">
                                        {filteredTasks.map((task) => (
                                            <Link
                                                key={task.$id}
                                                href={`/nurse/task/${task.$id}`}
                                            >
                                                <div className="p-4 border border-gray-200 rounded-lg hover:bg-blue-50 cursor-pointer transition">
                                                    <div className="flex items-start justify-between">
                                                        <div>
                                                            <h3 className="font-semibold text-gray-900">
                                                                Patient ID: {task.patientId}
                                                            </h3>
                                                            <p className="text-sm text-gray-600 mt-1">
                                                                {task.actionType}
                                                            </p>
                                                            <p className="text-sm text-gray-500 mt-2">
                                                                {task.description}
                                                            </p>
                                                        </div>
                                                        <span
                                                            className={`px-3 py-1 rounded-full text-xs font-medium ${task.status === "Pending"
                                                                ? "bg-yellow-100 text-yellow-800"
                                                                : task.status === "InProgress"
                                                                    ? "bg-blue-100 text-blue-800"
                                                                    : "bg-green-100 text-green-800"
                                                                }`}
                                                        >
                                                            {task.status}
                                                        </span>
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
