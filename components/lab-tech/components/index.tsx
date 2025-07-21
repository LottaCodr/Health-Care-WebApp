"use client";

import React, { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    FiUsers,
    FiClipboard,
    FiThermometer,
    FiClock,
    FiCheckCircle,
    FiUserX,
    FiChevronDown,
    FiChevronUp,
    FiFileText,
    FiMail,
    FiPhone,
    FiMapPin,
    FiUser,
    FiRefreshCw,
    FiUpload,
    FiImage,
    FiFile,
    FiXCircle,
} from "react-icons/fi";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getLabRequest, getLabTechTasks, updateLabTechAction } from "@/actions/lab-tech/get.labtech.task";
import { getUser } from "@/hooks/use-auth";
import clsx from "clsx";
import { LabTechFeedback } from "@/actions/lab-tech/types";

// Utility: Get greeting based on time and name
function getGreeting(name?: string) {
    const hour = new Date().getHours();
    if (hour < 12) return name ? `Good morning, ${name.split(" ")[0]}` : "Good morning";
    if (hour < 18) return name ? `Good afternoon, ${name.split(" ")[0]}` : "Good afternoon";
    return name ? `Good evening, ${name.split(" ")[0]}` : "Good evening";
}

// Utility: Format date string
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

// Utility: Get initials from name
function getInitials(name?: string) {
    if (!name) return "";
    const parts = name.trim().split(" ");
    return parts.length === 1
        ? parts[0][0]
        : (parts[0][0] + parts[1][0]);
}

// Helper: Preview file as image if possible
function getFilePreviewUrl(file: File) {
    if (file.type.startsWith("image/")) {
        return URL.createObjectURL(file);
    }
    return null;
}

export default function LabTechDashboardComponent() {
    const queryClient = useQueryClient();

    // State for result submission
    const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
    const [result, setResult] = useState("");
    const [resultError, setResultError] = useState<string | null>(null);
    const [expandedTestIds, setExpandedTestIds] = useState<string[]>([]);
    const [showSuccess, setShowSuccess] = useState(false);
    const [showCopied, setShowCopied] = useState<string | null>(null);

    // File/image upload state
    const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
    const [fileError, setFileError] = useState<string | null>(null);

    // For focusing textarea when opening result form
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    // Fetch user
    const { data: user } = useQuery({
        queryKey: ['user'],
        queryFn: getUser,
        staleTime: 1000 * 60 * 5,
        cacheTime: 1000 * 60 * 10, // cache for 10 minutes
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
        enabled: !!user?.id,
        staleTime: 1000 * 60 * 2,
        cacheTime: 1000 * 60 * 10,
        select: (data) => Array.isArray(data) ? data : [],
    });

    // Fetch lab tasks for the current user
    const {
        data: labTasks = [],
        isPending: tasksPending,
        error: tasksError
    } = useQuery({
        queryKey: ['lab-tasks', user?.id],
        queryFn: () => user?.id ? getLabTechTasks(user.id) : Promise.resolve([]),
        enabled: !!user?.id,
        staleTime: 1000 * 60 * 2,
        cacheTime: 1000 * 60 * 10,
        select: (data) => Array.isArray(data) ? data : [],
    });

    // Remove noisy console logs in production, but keep for dev
    if (process.env.NODE_ENV === "development") {
        // eslint-disable-next-line no-console
        console.log("labTasks:", labTasks);
        // eslint-disable-next-line no-console
        if (Array.isArray(labTasks)) {
            labTasks.forEach((task, idx) => {
                // eslint-disable-next-line no-console
                console.log(`labTasks[${idx}]:`, task);
            });
        }
        // eslint-disable-next-line no-console
        console.log("labRequests:", labRequests);
        // eslint-disable-next-line no-console
        console.log("user:", user);
    }

    // Mutation for submitting test result
    const {
        mutate: submitResult,
        isPending: isSubmitting,
        reset: resetMutation,
    } = useMutation({
        mutationFn: async ({ labTestId, result, files }: { labTestId: string, result: string, files?: File[] }) => {
            // Simulate file upload: In a real app, you would upload files to a storage service and get URLs
            // For now, just send the result and a list of file names as a placeholder
            // @ts-ignore
            return updateLabTechAction({
                documentId: labTestId,
                testResults: result,
                attachedFiles: files && files.length > 0 ? files.map(f => f.name) : undefined,
            });
        },
        onSuccess: () => {
            setResult("");
            setSelectedTestId(null);
            setResultError(null);
            setUploadedFiles([]);
            setFileError(null);
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 2500);
        },
        onError: () => {
            setResultError("Failed to submit result. Please try again.");
        },
        onSettled: () => {
            // Always invalidate lab-tasks for this user after mutation
            queryClient.invalidateQueries({ queryKey: ['lab-tasks', user?.id] });
        },
    });

    // Memoized stats for dashboard
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
        // Checked-in: unique patients in labRequests
        const checkedIn = Array.isArray(labRequests)
            ? new Set(
                labRequests.map((t: { patientId?: string | { $id?: string } }) =>
                    typeof t.patientId === "object" && t.patientId && t.patientId.$id
                        ? t.patientId.$id
                        : t.patientId
                )
            ).size
            : 0;
        // Pending: awaitingPayment or pending
        const pending = Array.isArray(labTasks)
            ? (labTasks as LabTechFeedback[]).filter((t) =>
                t.status === "awaitingPayment" || t.status === "pending"
            ).length
            : 0;
        // Completed
        const completed = Array.isArray(labTasks)
            ? (labTasks as LabTechFeedback[]).filter((t) => t.status === "completed").length
            : 0;
        // Queue: pending
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

    // Helper for expanding/collapsing test details
    const toggleExpandTest = useCallback((testId: string) => {
        setExpandedTestIds((prev) =>
            prev.includes(testId)
                ? prev.filter((id) => id !== testId)
                : [...prev, testId]
        );
    }, []);

    // Filter pending tests for display
    const pendingTests = useMemo(() => {
        if (!Array.isArray(labTasks)) return [];
        return (labTasks as LabTechFeedback[]).filter(
            (t) => t.status === "pending" || t.status === "awaitingPayment" || !t.status // fallback: show if no status
        );
    }, [labTasks]);

    // Focus textarea when opening result form
    useEffect(() => {
        if (selectedTestId && textareaRef.current) {
            textareaRef.current.focus();
        }
    }, [selectedTestId]);

    // Copy to clipboard helper
    const handleCopy = (text: string, id: string) => {
        if (typeof navigator !== "undefined" && navigator.clipboard) {
            navigator.clipboard.writeText(text);
            setShowCopied(id);
            setTimeout(() => setShowCopied(null), 1200);
        }
    };

    // File/image upload handlers
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFileError(null);
        const files = e.target.files;
        if (!files) return;
        const arr = Array.from(files);
        // Accept only images and pdfs, max 5 files, max 10MB each
        const allowedTypes = [
            "image/png",
            "image/jpeg",
            "image/jpg",
            "image/gif",
            "image/webp",
            "application/pdf",
        ];
        let error = "";
        if (arr.length + uploadedFiles.length > 5) {
            error = "You can upload up to 5 files/images.";
        }
        for (const file of arr) {
            if (!allowedTypes.includes(file.type)) {
                error = "Only images and PDF files are allowed.";
                break;
            }
            if (file.size > 10 * 1024 * 1024) {
                error = "Each file must be less than 10MB.";
                break;
            }
        }
        if (error) {
            setFileError(error);
            return;
        }
        setUploadedFiles(prev => [...prev, ...arr]);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleRemoveFile = (idx: number) => {
        setUploadedFiles(prev => prev.filter((_, i) => i !== idx));
    };

    // Access control
    if (user && user.role !== "lab-tech") {
        return (
            <div className="flex flex-col items-center justify-center min-h-[40vh] p-8 bg-white rounded-2xl shadow-lg border border-red-100 animate-fade-in">
                <div className="flex items-center gap-3 mb-3">
                    <span className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-red-100 text-red-600 text-3xl shadow">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-1.414 1.414A9 9 0 105.636 18.364l1.414-1.414M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </span>
                    <h2 className="text-2xl font-bold text-red-700">Access Denied</h2>
                </div>
                <p className="text-gray-700 text-center max-w-md mb-4">
                    You do not have permission to view this dashboard.<br />
                    If you believe this is a mistake, please contact your administrator.
                </p>
                <a
                    href="/"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-xl shadow hover:bg-red-700 transition font-semibold"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12h18M3 12l6-6m-6 6l6 6" />
                    </svg>
                    Go to Home
                </a>
            </div>
        );
    }

    if (requestsPending || tasksPending) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-4 bg-white/90 rounded-2xl shadow-lg border border-red-100 animate-fade-in">
                <div className="flex flex-col items-center gap-2">
                    <span className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-50 shadow">
                        <FiRefreshCw className="animate-spin text-4xl text-red-400" />
                    </span>
                    <span className="text-red-700 font-semibold text-lg animate-pulse">
                        Loading your dashboard...
                    </span>
                </div>
                <div className="flex flex-col items-center gap-1 text-gray-500 text-sm">
                    <span>
                        Fetching your latest lab tasks and requests.
                    </span>
                    <span className="flex items-center gap-1">
                        <svg className="w-4 h-4 text-red-300 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Please wait a moment...
                    </span>
                </div>
            </div>
        );
    }

    if (requestsError || tasksError) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-4 bg-white/90 rounded-2xl shadow-lg border border-red-100 animate-fade-in">
                <div className="flex flex-col items-center gap-2">
                    <span className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-50 shadow">
                        <svg className="w-10 h-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-1.414 1.414A9 9 0 105.636 18.364l1.414-1.414M12 8v4l3 3" />
                        </svg>
                    </span>
                    <h2 className="text-2xl font-bold text-red-700">Something Went Wrong</h2>
                </div>
                <p className="text-gray-700 text-center max-w-md mb-4">
                    We couldn't load your lab tasks.<br />
                    Please check your internet connection and try again.
                </p>
                <button
                    onClick={() => window.location.reload()}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-xl shadow hover:bg-red-700 transition font-semibold"
                >
                    <FiRefreshCw className="text-lg" />
                    Retry
                </button>
                <span className="text-xs text-gray-400 mt-2">If the problem persists, contact support.</span>
            </div>
        );
    }

    // Only one header at the top-level, and no stray <section> or duplicate <header>
    return (
        <div className="w-full px-2 md:px-8 py-8 space-y-12 bg-gradient-to-br from-red-50 via-white to-white dark:from-gray-900 dark:via-gray-950 dark:to-gray-900 min-h-screen">
            {/* Header */}
            <header className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-gray-800 flex items-center justify-center text-2xl font-bold text-red-600 dark:text-red-300 shadow">
                        {getInitials(user?.name)}
                    </div>
                    <div>
                        <h1 className="text-3xl md:text-4xl font-extrabold text-red-700 dark:text-red-200 tracking-tight drop-shadow-sm flex items-center gap-2">
                            {getGreeting(user?.name)}
                        </h1>
                        <p className="text-gray-700 dark:text-gray-300 mt-1 text-base">
                            {user?.name
                                ? `Welcome back, ${user.name.split(" ")[0]}. Here’s your personalized lab dashboard.`
                                : "Here's a snapshot of your activities today."}
                        </p>
                        <div className="flex gap-3 mt-2 text-xs text-gray-500 dark:text-gray-400">
                            {user?.email && (
                                <span className="flex items-center gap-1">
                                    <FiMail className="text-red-400" /> {user.email}
                                </span>
                            )}
                            {user?.name && (
                                <span
                                    className="flex items-center gap-1 px-2 py-1 rounded bg-red-100 dark:bg-gray-800 text-red-700 dark:text-red-200 font-medium shadow-sm cursor-pointer transition hover:bg-red-200 dark:hover:bg-gray-700"
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
                        className="border-red-500 text-red-600 dark:border-red-400 dark:text-red-300 hover:bg-red-50 dark:hover:bg-gray-800 flex items-center gap-2"
                        onClick={() => {
                            queryClient.invalidateQueries({ queryKey: ['lab-tasks', user?.id] });
                        }}
                        aria-label="Refresh lab tasks"
                    >
                        <FiRefreshCw className="animate-spin-slow" /> Refresh
                    </Button>
                </div>
            </header>

            {/* Success Toast */}
            {showSuccess && (
                <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-green-600 dark:bg-green-700 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in">
                    <FiCheckCircle className="text-xl" />
                    Result submitted successfully!
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {summaryStats.map((stat, idx) => (
                    <Card
                        key={stat.title}
                        className={clsx(
                            "shadow-xl border-0 bg-gradient-to-br relative group overflow-hidden dark:bg-gray-900",
                            idx === 0 && "from-red-100 to-white dark:from-gray-800 dark:to-gray-900",
                            idx === 1 && "from-red-200 to-white dark:from-gray-900 dark:to-gray-800",
                            idx === 2 && "from-red-50 to-white dark:from-gray-900 dark:to-gray-900",
                            idx === 3 && "from-red-300 to-white dark:from-gray-900 dark:to-gray-800",
                            "hover:scale-[1.05] transition-transform duration-200 cursor-pointer focus-within:ring-2 focus-within:ring-red-400"
                        )}
                        tabIndex={0}
                        aria-label={`${stat.title}: ${stat.count}`}
                        role="region"
                    >
                        {/* Decorative gradient accent */}
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-400/60 via-red-200/40 to-transparent dark:from-gray-700/60 dark:via-gray-800/40 dark:to-transparent" />
                        <CardContent className="flex flex-col items-center py-7 px-2 relative">
                            <div className="mb-3 flex items-center justify-center w-14 h-14 rounded-full bg-white dark:bg-gray-800 shadow-lg group-hover:bg-red-50 dark:group-hover:bg-gray-700 transition-colors border-2 border-red-100 dark:border-gray-700">
                                {stat.icon}
                            </div>
                            <div className="text-4xl font-black text-red-700 dark:text-red-200 mt-1 group-hover:text-red-900 dark:group-hover:text-red-100 transition-colors drop-shadow">
                                {stat.count}
                            </div>
                            <div className="text-sm text-gray-700 dark:text-gray-300 font-semibold mt-2 text-center tracking-wide">
                                {stat.title}
                            </div>
                            {/* Animated underline on hover */}
                            <span className="block h-0.5 w-8 bg-red-200 dark:bg-gray-700 rounded-full mt-3 opacity-0 group-hover:opacity-100 transition-all duration-200" />
                            {/* Tooltip for accessibility and extra info */}
                            <div className="absolute left-1/2 -translate-x-1/2 bottom-2 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity bg-white dark:bg-gray-900 border border-red-100 dark:border-gray-700 rounded px-2 py-1 text-xs text-red-700 dark:text-red-200 shadow z-10 whitespace-nowrap">
                                {stat.title}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Pending Lab Tests */}
            <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-red-50 dark:from-gray-900 dark:to-gray-800 dark:border-gray-800">
                <CardHeader>
                    <CardTitle className="text-2xl font-bold flex items-center gap-2 text-red-700 dark:text-red-200">
                        <FiClipboard className="text-red-500" /> Pending Lab Tests
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {pendingTests.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 bg-gradient-to-br from-green-50 to-white dark:from-gray-800 dark:to-gray-900 rounded-lg shadow-inner border border-green-100 dark:border-green-900 animate-fade-in">
                            <span className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900 shadow mb-3">
                                <FiCheckCircle className="text-5xl text-green-500 animate-bounce" />
                            </span>
                            <h3 className="text-xl font-semibold text-green-700 dark:text-green-300 mb-1">All Caught Up!</h3>
                            <p className="text-gray-600 dark:text-gray-300 text-base mb-2">
                                You have no pending lab tests assigned to you at the moment.
                            </p>
                            <span className="text-sm text-gray-400 dark:text-gray-500">
                                Please check back later or refresh for updates.
                            </span>
                        </div>
                    ) : (
                        pendingTests.map((test) => {
                            // Patient info: always use patientId if patient is undefined
                            const patientObj = test.patient && typeof test.patient === "object"
                                ? test.patient
                                : (test.patientId && typeof test.patientId === "object" ? test.patientId : {});

                            const patientName = patientObj.name || (typeof test.patientId === "string" ? test.patientId : "Unknown");
                            const patientGender = patientObj.gender || "";
                            let patientAge = "";
                            if (patientObj.birthDate) {
                                const age = Math.floor(
                                    (Date.now() - new Date(patientObj.birthDate).getTime()) /
                                    (365.25 * 24 * 60 * 60 * 1000)
                                );
                                patientAge = age > 0 ? `${age}` : "";
                            }
                            const patientIdDisplay =
                                patientObj.$id ||
                                (typeof test.patientId === "string"
                                    ? test.patientId
                                    : "");
                            const patientEmail = patientObj.email || "";
                            const patientPhone = patientObj.phone || "";
                            const patientAddress = patientObj.address || "";
                            const patientAllergies = patientObj.allergies || "";
                            const patientOccupation = patientObj.occupation || "";
                            const patientEmergencyContactName = patientObj.emergencyContactName || "";
                            const patientEmergencyContactNumber = patientObj.emergencyContactNumber || "";
                            const patientInsuranceProvider = patientObj.insuranceProvider || "";
                            const patientInsurancePolicyNumber = patientObj.insurancePolicyNumber || "";
                            const patientCurrentMedication = patientObj.currentMedication || "";
                            const patientFamilyMedicalHistory = patientObj.familyMedicalHistory || "";
                            const patientPrimaryPhysician = patientObj.primaryPhysician || "";
                            const patientDisclosureConsent = typeof patientObj.disclosureConsent === "boolean" ? (patientObj.disclosureConsent ? "Yes" : "No") : "";
                            const patientTreatmentConsent = typeof patientObj.treatmentConsent === "boolean" ? (patientObj.treatmentConsent ? "Yes" : "No") : "";
                            const patientIdentificationType = patientObj.identificationType || "";
                            const patientIdentificationNumber = patientObj.identificationNumber || "";
                            const patientIdentificationDocumentUrl = patientObj.identificationDocumentUrl || "";
                            const patientNotes = patientObj.notes || "";

                            // Lab Tech Info
                            const labTechObj = test.labTechId && typeof test.labTechId === "object" ? test.labTechId : {};
                            const labTechName = labTechObj.full_name || labTechObj.name || "";
                            const labTechEmail = labTechObj.email || "";
                            const labTechPhone = labTechObj.phone_number || labTechObj.phone || "";
                            const labTechStaffId = labTechObj.staff_id || "";
                            const labTechDepartment = labTechObj.department || "";
                            const labTechStatus = labTechObj.status || "";

                            // Doctor instructions, diagnosis, medications, recommendations
                            let doctorInstructions = "N/A";
                            if (typeof test.doctorInstructions === "string") {
                                doctorInstructions = test.doctorInstructions;
                            } else if (
                                test.doctorInstructions &&
                                typeof test.doctorInstructions === "object"
                            ) {
                                doctorInstructions = JSON.stringify(
                                    test.doctorInstructions
                                );
                            }
                            const doctorDiagnosis = test.doctorDiagnosis || "";
                            const doctorMedications = test.doctorMedications || "";
                            const doctorRecommendations = test.doctorRecommendations || "";

                            // Requested at
                            const requestedAt = formatDate(test.createdAt || test.updatedAt);

                            // Status
                            let statusIcon = <FiClock className="text-orange-400" />;
                            let statusText = test.status || "pending";
                            let statusColor = "text-orange-600";
                            if (test.status === "completed") {
                                statusIcon = <FiCheckCircle className="text-green-500" />;
                                statusColor = "text-green-600";
                            } else if (test.status === "awaitingPayment") {
                                statusIcon = <FiUserX className="text-yellow-500" />;
                                statusColor = "text-yellow-600";
                            }

                            const isExpanded =
                                test?.$id ? expandedTestIds.includes(test.$id) : false;

                            return (
                                <div
                                    key={test.$id}
                                    className={clsx(
                                        "border p-5 rounded-2xl shadow-md bg-white dark:bg-gray-800 space-y-2 transition-all",
                                        selectedTestId === test.$id
                                            ? "ring-2 ring-red-400 border-red-200 bg-red-50/40 dark:bg-red-900/40"
                                            : "border-gray-100 dark:border-gray-700",
                                        "hover:shadow-lg"
                                    )}
                                >
                                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                                                <span className="rounded-full bg-gradient-to-tr from-red-100 to-red-200 p-2 shadow-sm">
                                                    <FiUser className="text-red-500 w-5 h-5" />
                                                </span>
                                                <span className="font-bold text-red-800 text-lg tracking-tight truncate max-w-xs" title={patientName}>
                                                    {patientName}
                                                </span>
                                                <div className="flex flex-wrap gap-1 ml-0 sm:ml-2">
                                                    {patientGender && (
                                                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 font-medium" title="Gender">
                                                            {patientGender}
                                                        </span>
                                                    )}
                                                    {patientAge && (
                                                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 font-medium" title="Age">
                                                            {patientAge} yrs
                                                        </span>
                                                    )}
                                                    {patientIdDisplay && (
                                                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-gray-600 flex items-center" title="Patient ID">
                                                            <span className="font-semibold">ID:</span>{" "}
                                                            <span className="ml-1 tracking-widest font-mono">
                                                                {typeof patientIdDisplay === "string"
                                                                    ? patientIdDisplay.slice(-6)
                                                                    : ""}
                                                            </span>
                                                            <button
                                                                className="ml-1 text-blue-500 hover:bg-blue-50 rounded p-0.5 focus:outline-none focus:ring-2 focus:ring-blue-300 transition"
                                                                title="Copy Patient ID"
                                                                aria-label="Copy Patient ID"
                                                                onClick={() => handleCopy(
                                                                    typeof patientIdDisplay === "string"
                                                                        ? patientIdDisplay
                                                                        : "",
                                                                    test.$id + "-pid"
                                                                )}
                                                                tabIndex={0}
                                                                type="button"
                                                            >
                                                                <svg className="inline w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                                                    <rect x="9" y="9" width="13" height="13" rx="2" />
                                                                    <path d="M5 15V5a2 2 0 012-2h10" />
                                                                </svg>
                                                            </button>
                                                            <span
                                                                className={clsx(
                                                                    "ml-1 font-semibold transition-opacity duration-300",
                                                                    showCopied === test.$id + "-pid"
                                                                        ? "text-green-600 opacity-100 animate-fade-in"
                                                                        : "opacity-0"
                                                                )}
                                                                aria-live="polite"
                                                            >
                                                                Copied!
                                                            </span>
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap gap-2 items-center mb-1">
                                                <span className="text-sm text-gray-700 dark:text-gray-300 flex items-center">
                                                    <FiFileText className="inline mr-1 text-blue-400" />
                                                    <span className="font-semibold">Test:</span>
                                                    <span className="ml-1 font-medium text-gray-900 dark:text-gray-100 truncate max-w-xs" title={doctorInstructions}>{doctorInstructions}</span>
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-1">
                                                <span className="flex items-center">
                                                    {statusIcon}
                                                    <span
                                                        className={clsx(
                                                            statusColor,
                                                            "font-semibold ml-1"
                                                        )}
                                                    >
                                                        {statusText.charAt(0).toUpperCase() + statusText.slice(1)}
                                                    </span>
                                                </span>
                                                {requestedAt && (
                                                    <span className="ml-2 flex items-center gap-1">
                                                        <span className="font-semibold text-gray-400">Requested:</span>
                                                        <span className="text-gray-600">{requestedAt}</span>
                                                        <button
                                                            className="ml-1 text-blue-500 hover:bg-blue-50 rounded p-0.5 focus:outline-none focus:ring-2 focus:ring-blue-300 transition"
                                                            title="Copy Requested Date"
                                                            aria-label="Copy Requested Date"
                                                            onClick={() => handleCopy(requestedAt, test.$id + "-requestedAt")}
                                                            tabIndex={0}
                                                            type="button"
                                                        >
                                                            <svg className="inline w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                                                <rect x="9" y="9" width="13" height="13" rx="2" />
                                                                <path d="M5 15V5a2 2 0 012-2h10" />
                                                            </svg>
                                                        </button>
                                                        <span
                                                            className={clsx(
                                                                "ml-1 font-semibold transition-opacity duration-300",
                                                                showCopied === test.$id + "-requestedAt"
                                                                    ? "text-green-600 opacity-100 animate-fade-in"
                                                                    : "opacity-0"
                                                            )}
                                                            aria-live="polite"
                                                        >
                                                            Copied!
                                                        </span>
                                                    </span>
                                                )}
                                            </div>
                                            <button
                                                className={clsx(
                                                    "flex items-center gap-1 text-xs mt-1 transition",
                                                    isExpanded
                                                        ? "text-blue-600 font-semibold"
                                                        : "text-red-500 hover:underline"
                                                )}
                                                onClick={() =>
                                                    test?.$id && toggleExpandTest(test.$id)
                                                }
                                                aria-expanded={isExpanded}
                                                type="button"
                                                disabled={!test?.$id}
                                            >
                                                {isExpanded ? <FiChevronUp /> : <FiChevronDown />}
                                                {isExpanded
                                                    ? "Hide Details"
                                                    : "Show Details"}
                                            </button>
                                            {isExpanded && (
                                                <div
                                                    className="mt-3 bg-white/90 dark:bg-gray-700 rounded-xl p-4 text-sm text-gray-800 dark:text-gray-200 space-y-5 border border-red-200 dark:border-red-700 shadow-lg animate-fade-in"
                                                    aria-label="Patient and Doctor Details"
                                                >
                                                    {/* Contact Info */}
                                                    <div className="flex flex-wrap gap-3 items-center">
                                                        {patientEmail && (
                                                            <span className="flex items-center gap-1 bg-red-50 dark:bg-red-900 px-2 py-1 rounded-md">
                                                                <FiMail className="text-red-400" />
                                                                <span className="truncate max-w-[140px]">{patientEmail}</span>
                                                                <button
                                                                    className="ml-1 text-blue-500 hover:bg-blue-50 rounded p-0.5 focus:outline-none focus:ring-2 focus:ring-blue-300"
                                                                    title="Copy Email"
                                                                    aria-label="Copy Email"
                                                                    onClick={() => handleCopy(patientEmail, test.$id + "-email")}
                                                                    tabIndex={0}
                                                                    type="button"
                                                                >
                                                                    <svg className="inline w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                                                        <rect x="9" y="9" width="13" height="13" rx="2" />
                                                                        <path d="M5 15V5a2 2 0 012-2h10" />
                                                                    </svg>
                                                                </button>
                                                                <span
                                                                    className={clsx(
                                                                        "ml-1 font-semibold transition-opacity duration-300",
                                                                        showCopied === test.$id + "-email"
                                                                            ? "text-green-600 opacity-100 animate-fade-in"
                                                                            : "opacity-0"
                                                                    )}
                                                                    aria-live="polite"
                                                                >
                                                                    Copied!
                                                                </span>
                                                            </span>
                                                        )}
                                                        {patientPhone && (
                                                            <span className="flex items-center gap-1 bg-red-50 dark:bg-red-900 px-2 py-1 rounded-md">
                                                                <FiPhone className="text-red-400" />
                                                                <span className="truncate max-w-[120px]">{patientPhone}</span>
                                                                <button
                                                                    className="ml-1 text-blue-500 hover:bg-blue-50 rounded p-0.5 focus:outline-none focus:ring-2 focus:ring-blue-300"
                                                                    title="Copy Phone"
                                                                    aria-label="Copy Phone"
                                                                    onClick={() => handleCopy(patientPhone, test.$id + "-phone")}
                                                                    tabIndex={0}
                                                                    type="button"
                                                                >
                                                                    <svg className="inline w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                                                        <rect x="9" y="9" width="13" height="13" rx="2" />
                                                                        <path d="M5 15V5a2 2 0 012-2h10" />
                                                                    </svg>
                                                                </button>
                                                                <span
                                                                    className={clsx(
                                                                        "ml-1 font-semibold transition-opacity duration-300",
                                                                        showCopied === test.$id + "-phone"
                                                                            ? "text-green-600 opacity-100 animate-fade-in"
                                                                            : "opacity-0"
                                                                    )}
                                                                    aria-live="polite"
                                                                >
                                                                    Copied!
                                                                </span>
                                                            </span>
                                                        )}
                                                        {patientAddress && (
                                                            <span className="flex items-center gap-1 bg-red-50 dark:bg-red-900 px-2 py-1 rounded-md">
                                                                <FiMapPin className="text-red-400" />
                                                                <span className="truncate max-w-[180px]">{patientAddress}</span>
                                                            </span>
                                                        )}
                                                    </div>
                                                    {/* Patient Details */}
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                        {patientOccupation && (
                                                            <div>
                                                                <span className="font-semibold text-red-700">Occupation:</span>{" "}
                                                                <span>{patientOccupation}</span>
                                                            </div>
                                                        )}
                                                        {patientAllergies && (
                                                            <div>
                                                                <span className="font-semibold text-red-700">Allergies:</span>{" "}
                                                                <span>{patientAllergies}</span>
                                                            </div>
                                                        )}
                                                        {patientCurrentMedication && (
                                                            <div>
                                                                <span className="font-semibold text-red-700">Current Medication:</span>{" "}
                                                                <span>{patientCurrentMedication}</span>
                                                            </div>
                                                        )}
                                                        {patientFamilyMedicalHistory && (
                                                            <div>
                                                                <span className="font-semibold text-red-700">Family Medical History:</span>{" "}
                                                                <span>{patientFamilyMedicalHistory}</span>
                                                            </div>
                                                        )}
                                                        {patientPrimaryPhysician && (
                                                            <div>
                                                                <span className="font-semibold text-red-700">Primary Physician:</span>{" "}
                                                                <span>{patientPrimaryPhysician}</span>
                                                            </div>
                                                        )}
                                                        {patientEmergencyContactName && (
                                                            <div>
                                                                <span className="font-semibold text-red-700">Emergency Contact:</span>{" "}
                                                                <span>
                                                                    {patientEmergencyContactName}
                                                                    {patientEmergencyContactNumber && (
                                                                        <span className="text-gray-500"> ({patientEmergencyContactNumber})</span>
                                                                    )}
                                                                </span>
                                                            </div>
                                                        )}
                                                        {patientInsuranceProvider && (
                                                            <div>
                                                                <span className="font-semibold text-red-700">Insurance:</span>{" "}
                                                                <span>
                                                                    {patientInsuranceProvider}
                                                                    {patientInsurancePolicyNumber && (
                                                                        <span className="text-gray-500"> ({patientInsurancePolicyNumber})</span>
                                                                    )}
                                                                </span>
                                                            </div>
                                                        )}
                                                        {patientIdentificationType && (
                                                            <div>
                                                                <span className="font-semibold text-red-700">ID Type:</span>{" "}
                                                                <span>{patientIdentificationType}</span>
                                                            </div>
                                                        )}
                                                        {patientIdentificationNumber && (
                                                            <div>
                                                                <span className="font-semibold text-red-700">ID Number:</span>{" "}
                                                                <span>{patientIdentificationNumber}</span>
                                                            </div>
                                                        )}
                                                        {patientIdentificationDocumentUrl && (
                                                            <div>
                                                                <span className="font-semibold text-red-700">ID Document:</span>{" "}
                                                                <a
                                                                    href={patientIdentificationDocumentUrl}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="text-blue-600 underline hover:text-blue-800"
                                                                >
                                                                    View Document
                                                                </a>
                                                            </div>
                                                        )}
                                                        {patientDisclosureConsent && (
                                                            <div>
                                                                <span className="font-semibold text-red-700">Disclosure Consent:</span>{" "}
                                                                <span>{patientDisclosureConsent}</span>
                                                            </div>
                                                        )}
                                                        {patientTreatmentConsent && (
                                                            <div>
                                                                <span className="font-semibold text-red-700">Treatment Consent:</span>{" "}
                                                                <span>{patientTreatmentConsent}</span>
                                                            </div>
                                                        )}
                                                        {patientNotes && (
                                                            <div className="col-span-2">
                                                                <span className="font-semibold text-red-700">Patient Notes:</span>{" "}
                                                                <span>{patientNotes}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    {/* Doctor Info */}
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
                                                        <div>
                                                            <span className="font-semibold text-red-700">Doctor Diagnosis:</span>
                                                            <span className="ml-1">{doctorDiagnosis || <span className="text-gray-400">N/A</span>}</span>
                                                        </div>
                                                        <div>
                                                            <span className="font-semibold text-red-700">Doctor Medications:</span>
                                                            <span className="ml-1">{doctorMedications || <span className="text-gray-400">N/A</span>}</span>
                                                        </div>
                                                        <div>
                                                            <span className="font-semibold text-red-700">Doctor Recommendations:</span>
                                                            <span className="ml-1">{doctorRecommendations || <span className="text-gray-400">No additional notes.</span>}</span>
                                                        </div>
                                                    </div>
                                                    {/* Quick Actions */}
                                                    <div className="flex flex-wrap gap-2 mt-3">
                                                        {patientEmail && (
                                                            <a
                                                                href={`mailto:${patientEmail}`}
                                                                className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 transition"
                                                                tabIndex={0}
                                                                aria-label="Send Email"
                                                            >
                                                                <FiMail className="text-blue-400" />
                                                                Email Patient
                                                            </a>
                                                        )}
                                                        {patientPhone && (
                                                            <a
                                                                href={`tel:${patientPhone}`}
                                                                className="inline-flex items-center gap-1 px-2 py-1 rounded bg-green-50 text-green-700 hover:bg-green-100 transition"
                                                                tabIndex={0}
                                                                aria-label="Call Patient"
                                                            >
                                                                <FiPhone className="text-green-400" />
                                                                Call Patient
                                                            </a>
                                                        )}
                                                        {patientAddress && (
                                                            <a
                                                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                                                                    patientAddress
                                                                )}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="inline-flex items-center gap-1 px-2 py-1 rounded bg-yellow-50 text-yellow-700 hover:bg-yellow-100 transition"
                                                                tabIndex={0}
                                                                aria-label="View Address on Map"
                                                            >
                                                                <FiMapPin className="text-yellow-400" />
                                                                View on Map
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex flex-col gap-2 min-w-[220px]">
                                            {selectedTestId === test.$id ? (
                                                <div className="space-y-2 animate-fade-in">
                                                    <Label
                                                        htmlFor="test-result"
                                                        className="font-medium text-red-700"
                                                    >
                                                        Test Result
                                                    </Label>
                                                    <Textarea
                                                        id="test-result"
                                                        placeholder="Enter test result here..."
                                                        value={result}
                                                        onChange={(e) =>
                                                            setResult(e.target.value)
                                                        }
                                                        className={clsx(
                                                            "resize-none border-red-300 dark:border-red-600 focus:border-red-500 dark:focus:border-red-400 focus:ring-red-500 dark:focus:ring-red-400",
                                                            isSubmitting && "opacity-70"
                                                        )}
                                                        rows={3}
                                                        ref={textareaRef}
                                                        disabled={isSubmitting}
                                                        aria-label="Test result input"
                                                    />
                                                    {resultError && (
                                                        <div className="text-xs text-red-600">
                                                            {resultError}
                                                        </div>
                                                    )}
                                                    <div className="flex gap-3">
                                                        <Button
                                                            onClick={() => {
                                                                if (!result.trim()) {
                                                                    setResultError(
                                                                        "Result cannot be empty."
                                                                    );
                                                                    return;
                                                                }
                                                                if (
                                                                    !test.$id ||
                                                                    typeof test.$id !== "string"
                                                                ) {
                                                                    setResultError(
                                                                        "Invalid test ID."
                                                                    );
                                                                    return;
                                                                }
                                                                submitResult({
                                                                    labTestId: test.$id,
                                                                    result,
                                                                });
                                                            }}
                                                            disabled={isSubmitting}
                                                            className="bg-red-600 hover:bg-red-700 text-white font-semibold"
                                                            type="button"
                                                            aria-label="Submit test result"
                                                        >
                                                            {isSubmitting
                                                                ? (
                                                                    <span className="flex items-center gap-2">
                                                                        <FiRefreshCw className="animate-spin" />
                                                                        Submitting...
                                                                    </span>
                                                                )
                                                                : "Submit Result"}
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
                                                            className="border-red-400 text-red-600 hover:bg-red-50 dark:border-red-500 dark:text-red-300 dark:hover:bg-red-900"
                                                            type="button"
                                                            aria-label="Cancel result entry"
                                                        >
                                                            Cancel
                                                        </Button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <Button
                                                    onClick={() => {
                                                        setSelectedTestId(test.$id ?? null);
                                                        setResult("");
                                                        setResultError(null);
                                                        resetMutation();
                                                    }}
                                                    className="mt-2 bg-red-100 text-red-700 hover:bg-red-200 font-semibold"
                                                    variant="secondary"
                                                    type="button"
                                                    aria-label="Upload result"
                                                >
                                                    Upload Result
                                                </Button>
                                            )}
                                            {/* Show current test result if any */}
                                            {test.testResults && (
                                                <div className="mt-2 p-2 bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 rounded text-green-700 dark:text-green-300 text-xs flex items-center gap-2">
                                                    <span className="font-semibold">Current Result:</span>
                                                    <span className="truncate max-w-[120px]" title={test.testResults}>{test.testResults}</span>
                                                    <button
                                                        className="ml-1 text-blue-500 hover:underline focus:outline-none"
                                                        title="Copy Result"
                                                        aria-label="Copy Result"
                                                        onClick={() => handleCopy(test.testResults, test.$id + "-result")}
                                                        tabIndex={0}
                                                        type="button"
                                                    >
                                                        <svg className="inline w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                                            <rect x="9" y="9" width="13" height="13" rx="2" />
                                                            <path d="M5 15V5a2 2 0 012-2h10" />
                                                        </svg>
                                                    </button>
                                                    {showCopied === test.$id + "-result" && (
                                                        <span className="ml-1 text-green-600 font-semibold animate-fade-in">Copied!</span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
