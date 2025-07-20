"use client";

import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    FiUsers,
    FiClipboard,
    FiThermometer,
    FiClock,
    FiBell,
    FiCheckCircle,
    FiAlertCircle,
    FiBarChart,
    FiUser,
    FiUserCheck,
    FiUserX,
    FiChevronDown,
    FiChevronUp,
    FiFileText,
    FiMail,
    FiPhone,
    FiMapPin,
    FiInfo,
    FiRefreshCw,
} from "react-icons/fi";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useRole } from "@/hooks/use-role";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getLabRequest, getLabTechTasks, updateLabTechAction } from "@/actions/lab-tech/get.labtech.task";
import { getUser } from "@/hooks/use-auth";
import clsx from "clsx";

function getGreeting(name?: string) {
    const hour = new Date().getHours();
    let greet = "Hello";
    if (hour < 12) greet = "Good morning";
    else if (hour < 18) greet = "Good afternoon";
    else greet = "Good evening";
    return name ? `${greet}, ${name.split(" ")[0]}` : greet;
}

function formatDate(dateString?: string) {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function getInitials(name?: string) {
    if (!name) return "";
    const parts = name.split(" ");
    if (parts.length === 1) return parts[0][0];
    return parts[0][0] + parts[1][0];
}

export default function LabTechDashboardComponent() {
    const role = useRole();
    const queryClient = useQueryClient();

    // State for result submission
    const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
    const [result, setResult] = useState("");
    const [resultError, setResultError] = useState<string | null>(null);
    const [expandedTestIds, setExpandedTestIds] = useState<string[]>([]);

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

    // Mutation for submitting test result
    const {
        mutate: submitResult,
        isPending: isSubmitting,
        isSuccess: submitSuccess,
        isError: submitError,
        reset: resetMutation,
    } = useMutation({
        mutationFn: async ({ labTestId, result }: { labTestId: string, result: string }) => {
            // Fix: Actually send the result to the backend
            return updateLabTechAction({
                documentId: labTestId,
                bloodPressure: "",
                temperature: "",
                pulseRate: "",
                respiratoryRate: "",
                treatmentGiven: "",
                testResults: result, // Fix: send the result
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['lab-tasks', user?.id] });
            setResult("");
            setSelectedTestId(null);
            setResultError(null);
        },
        onError: () => {
            setResultError("Failed to submit result. Please try again.");
        }
    });

    // Stats
    const summaryStats = useMemo(() => {
        if (requestsError || tasksError) {
            return [
                {
                    title: "Checked-In Patients",
                    count: "-",
                    icon: <FiUsers className="text-red-600 w-6 h-6" />
                },
                {
                    title: "Pending Lab Results",
                    count: "-",
                    icon: <FiClipboard className="text-red-400 w-6 h-6" />
                },
                {
                    title: "Tests Completed",
                    count: "-",
                    icon: <FiThermometer className="text-red-300 w-6 h-6" />
                },
                {
                    title: "Queue Length",
                    count: "-",
                    icon: <FiClock className="text-red-800 w-6 h-6" />
                }
            ];
        }
        const checkedIn = Array.isArray(labRequests)
            ? new Set(
                labRequests.map((t: any) =>
                    typeof t.patientId === "object" && t.patientId && t.patientId.$id
                        ? t.patientId.$id
                        : t.patientId
                )
            ).size
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
                icon: <FiUsers className="text-red-600 w-6 h-6" />
            },
            {
                title: "Pending Lab Results",
                count: pending,
                icon: <FiClipboard className="text-red-400 w-6 h-6" />
            },
            {
                title: "Tests Completed",
                count: completed,
                icon: <FiThermometer className="text-red-300 w-6 h-6" />
            },
            {
                title: "Queue Length",
                count: queue,
                icon: <FiClock className="text-red-800 w-6 h-6" />
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

    // Notifications
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
        const notes: { message: string; time: string; type?: "urgent" | "info" }[] = [];
        if (urgent.length > 0) {
            notes.push({
                message: `You have ${urgent.length} urgent test request${urgent.length > 1 ? "s" : ""}`,
                time: "Just now",
                type: "urgent"
            });
        }
        // Example: low stock notification (static for now)
        notes.push({
            message: "Stock of reagent X is low",
            time: "30 mins ago",
            type: "info"
        });
        if (notes.length === 0) {
            notes.push({
                message: "No new notifications.",
                time: ""
            });
        }
        return notes;
    }, [labTasks]);

    // Filter pending tests for the main list
    const pendingTests = useMemo(() => {
        if (!Array.isArray(labTasks)) return [];
        // Only show tests assigned to this lab tech and not completed
        return labTasks.filter((t: any) => {
            // If user?.id is not available, fallback to showing all
            if (!user?.id) return t.status !== "completed";
            return t.labTechId === user.id && t.status !== "completed";
        });
    }, [labTasks, user?.id]);

    // Helper for expanding/collapsing test details
    const toggleExpandTest = (testId: string) => {
        setExpandedTestIds((prev) =>
            prev.includes(testId)
                ? prev.filter((id) => id !== testId)
                : [...prev, testId]
        );
    };

    if (role !== "lab-tech") {
        return (
            <div className="p-6 text-red-600">
                Access Denied: You do not have permission to view this dashboard.
            </div>
        );
    }

    if (requestsPending || tasksPending) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-2">
                <FiRefreshCw className="animate-spin text-3xl text-red-400" />
                <span className="text-red-600 font-medium animate-pulse">Loading your dashboard...</span>
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
        <section className="w-full px-2 md:px-8 py-6 space-y-10 bg-gradient-to-br from-red-50 via-white to-white min-h-screen">
            {/* Header */}
            <header className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center text-2xl font-bold text-red-600 shadow">
                        {getInitials(user?.name)}
                    </div>
                    <div>
                        <h1 className="text-3xl md:text-4xl font-extrabold text-red-700 tracking-tight drop-shadow-sm flex items-center gap-2">
                            {getGreeting(user?.name)}
                        </h1>
                        <p className="text-gray-700 mt-1 text-base">
                            {user?.name
                                ? `Welcome back, ${user.name.split(" ")[0]}. Here’s your personalized lab dashboard.`
                                : "Here's a snapshot of your activities today."}
                        </p>
                        <div className="flex gap-3 mt-2 text-xs text-gray-500">
                            {user?.email && (
                                <span className="flex items-center gap-1">
                                    <FiMail className="text-red-400" /> {user.email}
                                </span>
                            )}
                            {user?.name && (
                                <span
                                    className="flex items-center gap-1 px-2 py-1 rounded bg-red-100 text-red-700 font-medium shadow-sm cursor-pointer transition hover:bg-red-200"
                                    title={user.name}
                                    tabIndex={0}
                                    aria-label={`User name: ${user.name}`}
                                >
                                    <FiUser className="text-red-400" />
                                    <span className="truncate max-w-[120px]">{user.name}</span>
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="border-red-500 text-red-600 hover:bg-red-50 flex items-center gap-2"
                        onClick={() => {
                            queryClient.invalidateQueries({ queryKey: ['lab-tasks', user?.id] });
                        }}
                    >
                        <FiRefreshCw className="animate-spin-slow" /> Refresh
                    </Button>
                </div>
            </header>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {summaryStats.map((stat, idx) => (
                    <Card
                        key={stat.title}
                        className={clsx(
                            "shadow-xl border-0 bg-gradient-to-br relative group overflow-hidden",
                            idx === 0 && "from-red-100 to-white",
                            idx === 1 && "from-red-200 to-white",
                            idx === 2 && "from-red-50 to-white",
                            idx === 3 && "from-red-300 to-white",
                            "hover:scale-[1.05] transition-transform duration-200 cursor-pointer focus-within:ring-2 focus-within:ring-red-400"
                        )}
                        tabIndex={0}
                        aria-label={`${stat.title}: ${stat.count}`}
                        role="region"
                    >
                        {/* Decorative gradient accent */}
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-400/60 via-red-200/40 to-transparent" />
                        <CardContent className="flex flex-col items-center py-7 px-2 relative">
                            <div className="mb-3 flex items-center justify-center w-14 h-14 rounded-full bg-white shadow-lg group-hover:bg-red-50 transition-colors border-2 border-red-100">
                                {stat.icon}
                            </div>
                            <div className="text-4xl font-black text-red-700 mt-1 group-hover:text-red-900 transition-colors drop-shadow">
                                {stat.count}
                            </div>
                            <div className="text-sm text-gray-700 font-semibold mt-2 text-center tracking-wide">
                                {stat.title}
                            </div>
                            {/* Animated underline on hover */}
                            <span className="block h-0.5 w-8 bg-red-200 rounded-full mt-3 opacity-0 group-hover:opacity-100 transition-all duration-200" />
                            {/* Tooltip for accessibility and extra info */}
                            <div className="absolute left-1/2 -translate-x-1/2 bottom-2 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity bg-white border border-red-100 rounded px-2 py-1 text-xs text-red-700 shadow z-10 whitespace-nowrap">
                                {stat.title}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Pending Lab Tests */}
            <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-red-50">
                <CardHeader>
                    <CardTitle className="text-2xl font-bold flex items-center gap-2 text-red-700">
                        <FiClipboard className="text-red-500" /> Pending Lab Tests
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {pendingTests.length === 0 ? (
                        <div className="text-gray-500 text-center py-8">
                            <FiCheckCircle className="mx-auto text-4xl text-green-500 mb-2" />
                            No pending tests assigned to you.
                        </div>
                    ) : (
                        pendingTests.map((test: any) => {
                            // Defensive: handle patient field being an object or id
                            let patientName = "";
                            let patientGender = "";
                            let patientAge = "";
                            let patientIdDisplay = "";
                            let patientEmail = "";
                            let patientPhone = "";
                            let patientAddress = "";
                            let patientAllergies = "";
                            if (test.patient && typeof test.patient === "object" && test.patient.name) {
                                patientName = test.patient.name;
                                patientGender = test.patient.gender || "";
                                patientAge = test.patient.birthDate
                                    ? `${Math.max(0, Math.floor((new Date().getTime() - new Date(test.patient.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000)))}`
                                    : "";
                                patientIdDisplay = test.patient.$id || "";
                                patientEmail = test.patient.email || "";
                                patientPhone = test.patient.phone || "";
                                patientAddress = test.patient.address || "";
                                patientAllergies = test.patient.allergies || "";
                            } else if (
                                test.patient && typeof test.patient === "object"
                            ) {
                                // fallback for object patient without name
                                patientName = test.patient.name || "Unknown";
                                patientGender = test.patient.gender || "";
                                patientAge = test.patient.birthDate
                                    ? `${Math.max(0, Math.floor((new Date().getTime() - new Date(test.patient.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000)))}`
                                    : "";
                                patientIdDisplay = test.patient.$id || "";
                                patientEmail = test.patient.email || "";
                                patientPhone = test.patient.phone || "";
                                patientAddress = test.patient.address || "";
                                patientAllergies = test.patient.allergies || "";
                            } else if (
                                typeof test.patientId === "string"
                            ) {
                                patientName = test.patientId;
                                patientIdDisplay = test.patientId;
                            } else {
                                patientName = "Unknown";
                            }

                            // Defensive: doctorInstructions may be an object or string
                            let doctorInstructions = "";
                            if (typeof test.doctorInstructions === "string") {
                                doctorInstructions = test.doctorInstructions;
                            } else if (
                                test.doctorInstructions &&
                                typeof test.doctorInstructions === "object"
                            ) {
                                doctorInstructions = JSON.stringify(test.doctorInstructions);
                            } else {
                                doctorInstructions = "N/A";
                            }

                            // Defensive: createdAt
                            const requestedAt = formatDate(test.updatedAt);

                            // Defensive: status
                            let statusIcon = <FiClock className="text-orange-400" />;
                            let statusText = test.status;
                            let statusColor = "text-orange-600";
                            if (test.status === "completed") {
                                statusIcon = <FiCheckCircle className="text-green-500" />;
                                statusColor = "text-green-600";
                            } else if (test.status === "awaitingPayment") {
                                statusIcon = <FiUserX className="text-yellow-500" />;
                                statusColor = "text-yellow-600";
                            }

                            const isExpanded = expandedTestIds.includes(test?.$id);

                            return (
                                <div
                                    key={test.$id}
                                    className={clsx(
                                        "border p-5 rounded-2xl shadow-md bg-white space-y-2 transition-all",
                                        selectedTestId === test.$id
                                            ? "ring-2 ring-red-400 border-red-200 bg-red-50/40"
                                            : "border-gray-100",
                                        "hover:shadow-lg"
                                    )}
                                >
                                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="rounded-full bg-red-100 p-1">
                                                    <FiUser className="text-red-400" />
                                                </span>
                                                <span className="font-semibold text-red-700 text-lg">{patientName}</span>
                                                {patientGender && (
                                                    <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                                                        {patientGender}
                                                    </span>
                                                )}
                                                {patientAge && (
                                                    <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                                                        {patientAge} yrs
                                                    </span>
                                                )}
                                                {patientIdDisplay && (
                                                    <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-gray-50 text-gray-400 border border-gray-100">
                                                        ID: {typeof patientIdDisplay === "string" ? patientIdDisplay.slice(-6) : ""}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex flex-wrap gap-2 items-center mb-1">
                                                <span className="text-sm text-gray-600">
                                                    <FiFileText className="inline mr-1 text-blue-400" />
                                                    Test: <span className="font-medium">{doctorInstructions}</span>
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                                                {statusIcon}
                                                <span className={clsx(statusColor, "font-semibold")}>{statusText}</span>
                                                {requestedAt && (
                                                    <span className="ml-2">Requested: {requestedAt}</span>
                                                )}
                                            </div>
                                            <button
                                                className="flex items-center gap-1 text-xs text-red-500 hover:underline mt-1"
                                                onClick={() => toggleExpandTest(test?.$id)}
                                                aria-expanded={isExpanded}
                                                type="button"
                                            >
                                                {isExpanded ? <FiChevronUp /> : <FiChevronDown />}
                                                {isExpanded ? "Hide Details" : "Show Details"}
                                            </button>
                                            {isExpanded && (
                                                <div className="mt-2 bg-red-50/60 rounded-lg p-3 text-xs text-gray-700 space-y-2 border border-red-100">
                                                    <div className="flex flex-wrap gap-4">
                                                        {patientEmail && (
                                                            <span className="flex items-center gap-1">
                                                                <FiMail className="text-red-400" /> {patientEmail}
                                                            </span>
                                                        )}
                                                        {patientPhone && (
                                                            <span className="flex items-center gap-1">
                                                                <FiPhone className="text-red-400" /> {patientPhone}
                                                            </span>
                                                        )}
                                                        {patientAddress && (
                                                            <span className="flex items-center gap-1">
                                                                <FiMapPin className="text-red-400" /> {patientAddress}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <span className="font-semibold">Allergies:</span>{" "}
                                                        {patientAllergies || "None"}
                                                    </div>
                                                    <div>
                                                        <span className="font-semibold">Notes:</span>{" "}
                                                        {test.notes || "No additional notes."}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex flex-col gap-2 min-w-[200px]">
                                            {selectedTestId === test.$id ? (
                                                <div className="space-y-2">
                                                    <Label htmlFor="test-result" className="font-medium text-red-700">Test Result</Label>
                                                    <Textarea
                                                        id="test-result"
                                                        placeholder="Enter test result here..."
                                                        value={result}
                                                        onChange={(e) => setResult(e.target.value)}
                                                        className="resize-none border-red-300 focus:border-red-500 focus:ring-red-500"
                                                        rows={3}
                                                        autoFocus
                                                    />
                                                    {resultError && (
                                                        <div className="text-xs text-red-600">{resultError}</div>
                                                    )}
                                                    <div className="flex gap-3">
                                                        <Button
                                                            onClick={() => {
                                                                if (!result.trim()) {
                                                                    setResultError("Result cannot be empty.");
                                                                    return;
                                                                }
                                                                submitResult({ labTestId: test?.$id, result });
                                                            }}
                                                            disabled={isSubmitting}
                                                            className="bg-red-600 hover:bg-red-700 text-white font-semibold"
                                                            type="button"
                                                        >
                                                            {isSubmitting ? "Submitting..." : "Submit Result"}
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            onClick={() => {
                                                                setSelectedTestId(null);
                                                                setResult("");
                                                                setResultError(null);
                                                                resetMutation();
                                                            }}
                                                            disabled={isSubmitting}
                                                            className="border-red-400 text-red-600 hover:bg-red-50"
                                                            type="button"
                                                        >
                                                            Cancel
                                                        </Button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <Button
                                                    onClick={() => {
                                                        setSelectedTestId(test?.$id);
                                                        setResult("");
                                                        setResultError(null);
                                                        resetMutation();
                                                    }}
                                                    className="mt-2 bg-red-100 text-red-700 hover:bg-red-200 font-semibold"
                                                    variant="secondary"
                                                    type="button"
                                                >
                                                    Upload Result
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </CardContent>
            </Card>
        </section>
    );
}
