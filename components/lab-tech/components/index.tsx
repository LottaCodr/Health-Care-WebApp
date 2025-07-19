"use client";

import React, { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
    FiUsers,
    FiClipboard,
    FiThermometer,
    FiClock
} from "react-icons/fi";
import {
    MdAssignment,
    MdPeople,
    MdScience,
    MdWarning
} from "react-icons/md";
import { BsBarChart } from "react-icons/bs";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer
} from "recharts";
import { useRole } from "@/hooks/use-role";
import { useQuery } from "@tanstack/react-query";
import { getLabRequest, getLabTechTasks } from "@/actions/lab-tech/get.labtech.task";
import { getUser } from "@/hooks/use-auth";
// import { useUserProfile } from "@/hooks/use-user-profile";

function getGreeting(name?: string) {
    const hour = new Date().getHours();
    let greet = "Hello";
    if (hour < 12) greet = "Good morning";
    else if (hour < 18) greet = "Good afternoon";
    else greet = "Good evening";
    return name ? `${greet}, ${name}` : greet;
}

export default function LabTechDashboardComponent() {
    const role = useRole();
    // const { userProfile, isLoading: profileLoading } = useUserProfile();

    const { data: user } = useQuery({
        queryKey: ['user'],
        queryFn: () => getUser(),
        select: (data) => data,
        staleTime: 1000 * 60 * 5,
        gcTime: 1000 * 60 * 5,
        retry: 3,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: false,
        refetchInterval: 1000 * 60 * 5,
        refetchIntervalInBackground: true,
    });

    // Fetch lab requests for the current user
    const {
        data: labRequests = [],
        isPending: requestsPending,
        error: requestsError
    } = useQuery({
        queryKey: ['lab-requests', user?.id],
        queryFn: () => user?.id ? getLabRequest(user.id) : Promise.resolve([]),
        enabled: !!user?.id
    });

    // Fetch lab tasks for the current user
    const {
        data: labTasks = [],
        isPending: tasksPending,
        error: tasksError
    } = useQuery({
        queryKey: ['lab-tasks', user?.id],
        queryFn: () => user?.id ? getLabTechTasks(user.id) : Promise.resolve([]),
        enabled: !!user?.id
    });

    // Personalized stats
    const summaryStats = useMemo(() => {
        if (requestsError || tasksError) {
            return [
                {
                    title: "Checked-In Patients",
                    count: "-",
                    icon: <FiUsers className="text-blue-600 w-5 h-5" />
                },
                {
                    title: "Pending Lab Results",
                    count: "-",
                    icon: <FiClipboard className="text-yellow-600 w-5 h-5" />
                },
                {
                    title: "Tests Completed",
                    count: "-",
                    icon: <FiThermometer className="text-green-600 w-5 h-5" />
                },
                {
                    title: "Queue Length",
                    count: "-",
                    icon: <FiClock className="text-red-600 w-5 h-5" />
                }
            ];
        }
        const checkedIn = Array.isArray(labRequests)
            ? new Set(labRequests.map((t: any) => t.patientId)).size
            : 0;
        const pending = Array.isArray(labTasks)
            ? labTasks.filter((t: any) => t.status === "awaitingPayment" || t.status === "pending").length
            : 0;
        const completed = Array.isArray(labTasks)
            ? labTasks.filter((t: any) => t.status === "completed").length
            : 0;
        const queue = pending;
        return [
            {
                title: "Checked-In Patients",
                count: checkedIn,
                icon: <FiUsers className="text-blue-600 w-5 h-5" />
            },
            {
                title: "Pending Lab Results",
                count: pending,
                icon: <FiClipboard className="text-yellow-600 w-5 h-5" />
            },
            {
                title: "Tests Completed",
                count: completed,
                icon: <FiThermometer className="text-green-600 w-5 h-5" />
            },
            {
                title: "Queue Length",
                count: queue,
                icon: <FiClock className="text-red-600 w-5 h-5" />
            }
        ];
    }, [labRequests, labTasks, requestsError, tasksError]);

    // Chart data: tests completed per weekday
    const chartData = useMemo(() => {
        if (!Array.isArray(labTasks) || labTasks.length === 0) return [];
        const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const now = new Date();
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        const counts: Record<string, number> = {};
        for (let i = 0; i < 7; i++) {
            const d = new Date(weekStart);
            d.setDate(weekStart.getDate() + i);
            const key = days[d.getDay()];
            counts[key] = 0;
        }
        labTasks.forEach((t: any) => {
            if (t.status === "completed" && t.createdAt) {
                const d = new Date(t.createdAt);
                const key = days[d.getDay()];
                if (counts[key] !== undefined) counts[key]++;
            }
        });
        return days.map(day => ({ name: day, tests: counts[day] || 0 }));
    }, [labTasks]);

    // Personalized notifications
    const notifications = useMemo(() => {
        if (!Array.isArray(labTasks) || labTasks.length === 0) {
            return [
                {
                    message: "No new notifications.",
                    time: ""
                }
            ];
        }
        const urgent = labTasks.filter(
            (t: any) =>
                t.status === "pending" &&
                typeof t.doctorInstructions === "string" &&
                t.doctorInstructions.toLowerCase().includes("urgent")
        );
        const notes: { message: string; time: string }[] = [];
        if (urgent.length > 0) {
            notes.push({
                message: `You have ${urgent.length} urgent test request${urgent.length > 1 ? "s" : ""}`,
                time: "Just now"
            });
        }
        // Example: low stock notification (static for now)
        notes.push({
            message: "Stock of reagent X is low",
            time: "30 mins ago"
        });
        if (notes.length === 0) {
            notes.push({
                message: "No new notifications.",
                time: ""
            });
        }
        return notes;
    }, [labTasks]);

    if (role !== "lab-tech") {
        return (
            <div className="p-6 text-red-600">
                Access Denied: You do not have permission to view this dashboard.
            </div>
        );
    }

    if (requestsPending || tasksPending) {
        return (
            <div className="flex items-center justify-center h-64">
                <span className="text-blue-700 font-medium animate-pulse">Loading your dashboard...</span>
            </div>
        );
    }

    if (requestsError || tasksError) {
        return (
            <div className="p-6 text-red-600">
                Failed to load your lab tasks. Please refresh the page.
            </div>
        );
    }

    return (
        <section className="w-full px-4 md:px-8 py-6 space-y-6">
            <header className="mb-4">
                <h1 className="text-2xl md:text-3xl font-bold text-blue-900">
                    {getGreeting(user?.name)}
                </h1>
                <p className="text-gray-600">
                    {user?.name
                        ? `Welcome back, ${user.name}. Here’s your personalized lab dashboard.`
                        : "Here's a snapshot of your activities today."}
                </p>
            </header>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {summaryStats.map((stat, idx) => (
                    <Card key={idx} className="shadow-sm border border-gray-200">
                        <CardContent className="flex items-center justify-between p-4">
                            <div>
                                <p className="text-sm text-gray-500">{stat.title}</p>
                                <p className="text-xl font-semibold text-gray-800">
                                    {stat.count}
                                </p>
                            </div>
                            <div className="bg-blue-50 rounded-full p-2">{stat.icon}</div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="flex items-center gap-4 p-4">
                        <MdAssignment className="text-blue-600 w-8 h-8" />
                        <div>
                            <p className="text-gray-600">Pending Lab Tests</p>
                            <p className="text-xl font-bold">
                                {summaryStats[1]?.count}
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="flex items-center gap-4 p-4">
                        <MdPeople className="text-green-600 w-8 h-8" />
                        <div>
                            <p className="text-gray-600">Patients in Queue</p>
                            <p className="text-xl font-bold">
                                {summaryStats[3]?.count}
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="flex items-center gap-4 p-4">
                        <MdScience className="text-purple-600 w-8 h-8" />
                        <div>
                            <p className="text-gray-600">Tests Completed Today</p>
                            <p className="text-xl font-bold">
                                {
                                    chartData.length > 0
                                        ? chartData[new Date().getDay()]?.tests
                                        : "-"
                                }
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Charts + Notifications */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                    <CardContent className="p-4">
                        <h2 className="text-lg font-semibold text-blue-800 mb-2">
                            Your Weekly Test Volume
                        </h2>
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={chartData}>
                                <XAxis dataKey="name" stroke="#8884d8" />
                                <YAxis allowDecimals={false} />
                                <Tooltip />
                                <Bar dataKey="tests" fill="#4F46E5" barSize={30} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <h2 className="text-lg font-semibold text-blue-800 mb-2">
                            Notifications
                        </h2>
                        <ul className="space-y-2">
                            {notifications.map((note, idx) => (
                                <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                                    <MdWarning className="text-yellow-500 mt-1 w-5 h-5" />
                                    <div>
                                        <p>{note.message}</p>
                                        {note.time && (
                                            <span className="text-xs text-gray-400">{note.time}</span>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            </div>

            {/* Quick Actions + Placeholder */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="shadow-sm border border-gray-200">
                    <CardContent className="p-4 space-y-2">
                        <h2 className="text-lg font-semibold text-blue-800 mb-2">Quick Actions</h2>
                        <div className="flex flex-wrap gap-2">
                            <Link href="/lab-tech/new-entry" passHref legacyBehavior>
                                <Button variant="outline" size="sm" >New Lab Entry</Button>
                            </Link>

                            <Link href="/lab-tech/queue" passHref legacyBehavior>
                                <Button variant="outline" size="sm" >View Queue</Button>
                            </Link>

                            <Link href="/lab-tech/upload-result" passHref legacyBehavior>
                                <Button variant="outline" size="sm" >Upload Result</Button>
                            </Link>

                            <Link href="/lab-tech/patient-records" passHref legacyBehavior>
                                <Button variant="outline" size="sm" >Patient Records</Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-sm border border-gray-200">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <BsBarChart className="w-6 h-6 text-blue-500" />
                            <h2 className="text-lg font-semibold text-blue-800">
                                Lab Activity Insights (Coming Soon)
                            </h2>
                        </div>
                        <p className="text-sm text-gray-500 mt-2">
                            Analytics on your turnaround time, most frequent tests, and more.
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="pt-4 flex flex-col md:flex-row gap-2 md:gap-4">
                <Button asChild variant="default">
                    <Link href="/lab-tech/workflow">Go to Lab Workflow</Link>
                </Button>
                <Button asChild variant="secondary">
                    <Link href="/lab-tech/my-tasks">My Lab Tasks</Link>
                </Button>
            </div>
        </section>
    );
}
