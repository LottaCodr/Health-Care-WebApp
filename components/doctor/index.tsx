import React, { useState } from "react";
import { useAuth } from "@/context/auth-provider";
import { useRoleProtection } from "@/lib/role-utils";
import { UserRole, PatientStatus } from "@/types/models";
import {
    usePatientsByStatus,
    useConsultationsByDoctor,
} from "@/hooks/use-emr";
import {
    PatientInfoCard,
    ConsultationCard,
    LoadingSkeleton,
    EmptyState,
    ErrorAlert,
} from "@/components/emr-ui";




// Tab navigation
function TabNavigation({
    tabs,
    activeTab,
    onChange,
}: {
    tabs: { id: string; label: string; badge?: number }[];
    activeTab: string;
    onChange: (tab: string) => void;
}) {
    return (
        <div className="flex border-b border-gray-200 mb-6">
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => onChange(tab.id)}
                    className={`px-4 py-2 font-medium border-b-2 transition-colors ${activeTab === tab.id
                        ? "border-blue-500 text-blue-600"
                        : "border-transparent text-gray-600 hover:text-gray-900"
                        }`}
                >
                    {tab.label}
                    {tab.badge !== undefined && (
                        <span className="ml-2 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                            {tab.badge}
                        </span>
                    )}
                </button>
            ))}
        </div>
    );
}

/**
 * Doctor Dashboard
 * Manages consultations, patient queue, and medical records
 */
const DashBoardComponent = () => {
    const { user } = useAuth();
    const { authorized, loading: protectionLoading } = useRoleProtection([
        UserRole.Doctor,
        UserRole.Admin,
    ]);

    const [activeTab, setActiveTab] = useState<string>("queue");
    const [dismissedErrors, setDismissedErrors] = useState<string[]>([]);

    // Fetch patients awaiting consultation
    const awaitingConsultationPatients = usePatientsByStatus(
        PatientStatus.AwaitingConsultation
    );

    // Fetch my consultations
    const myConsultations = useConsultationsByDoctor(user?.$id || "");

    if (protectionLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!authorized) {
        return null;
    }

    const tabs = [
        {
            id: "queue",
            label: "Consultation Queue",
            badge: awaitingConsultationPatients.data?.length || 0,
        },
        {
            id: "my-consultations",
            label: "My Consultations",
            badge: myConsultations.data?.length || 0,
        },
        {
            id: "completed",
            label: "Completed",
            badge: myConsultations.data?.filter((c) => c.status === "Completed").length || 0,
        },
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header omitted as it's typically in the layout or page wrapper, 
                but keeping the stats overview and tabs as requested */}

            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Overview Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-white rounded-lg shadow p-6 border-l-4 border-yellow-500">
                        <p className="text-gray-600 text-sm font-medium">Waiting for Consultation</p>
                        <p className="text-3xl font-bold text-gray-900 mt-2">
                            {awaitingConsultationPatients.data?.length || 0}
                        </p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
                        <p className="text-gray-600 text-sm font-medium">My Consultations</p>
                        <p className="text-3xl font-bold text-gray-900 mt-2">
                            {myConsultations.data?.filter((c) => c.status === "InProgress").length || 0}
                        </p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
                        <p className="text-gray-600 text-sm font-medium">Completed Today</p>
                        <p className="text-3xl font-bold text-gray-900 mt-2">
                            {myConsultations.data?.filter((c) => c.status === "Completed").length || 0}
                        </p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
                        <p className="text-gray-600 text-sm font-medium">Total Patients Seen</p>
                        <p className="text-3xl font-bold text-gray-900 mt-2">
                            {myConsultations.data?.length || 0}
                        </p>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="bg-white rounded-lg shadow p-6">
                    <TabNavigation tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

                    {/* Tab Content */}
                    <div>
                        {/* Queue Tab */}
                        {activeTab === "queue" && (
                            <div>
                                {awaitingConsultationPatients.loading && <LoadingSkeleton rows={4} />}
                                {awaitingConsultationPatients.error &&
                                    !dismissedErrors.includes("queue") && (
                                        <ErrorAlert
                                            error={awaitingConsultationPatients.error}
                                            onDismiss={() =>
                                                setDismissedErrors([...dismissedErrors, "queue"])
                                            }
                                        />
                                    )}
                                {!awaitingConsultationPatients.loading &&
                                    awaitingConsultationPatients.data?.length === 0 && (
                                        <EmptyState
                                            title="No Patients Waiting"
                                            description="All patients have been seen or are in consultation"
                                            icon="✓"
                                        />
                                    )}
                                <div className="grid gap-4">
                                    {awaitingConsultationPatients.data?.map((patient, index) => (
                                        <div
                                            key={patient.$id}
                                            className="flex justify-between items-center"
                                        >
                                            <div className="flex items-center gap-4 flex-1">
                                                <div className="w-8 h-8 rounded-full bg-yellow-500 text-white flex items-center justify-center font-bold">
                                                    {index + 1}
                                                </div>
                                                <div className="flex-1">
                                                    <PatientInfoCard patient={patient} />
                                                </div>
                                            </div>
                                            <div className="ml-4 flex gap-2">
                                                <a href={`/patient-timeline/${patient.$id}`} className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm font-medium">
                                                    Timeline
                                                </a>
                                                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium whitespace-nowrap">
                                                    Start Consultation
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* My Consultations Tab */}
                        {activeTab === "my-consultations" && (
                            <div>
                                {myConsultations.loading && <LoadingSkeleton rows={4} />}
                                {myConsultations.error &&
                                    !dismissedErrors.includes("my-consultations") && (
                                        <ErrorAlert
                                            error={myConsultations.error}
                                            onDismiss={() =>
                                                setDismissedErrors([
                                                    ...dismissedErrors,
                                                    "my-consultations",
                                                ])
                                            }
                                        />
                                    )}
                                {!myConsultations.loading &&
                                    myConsultations.data?.length === 0 && (
                                        <EmptyState
                                            title="No Consultations"
                                            description="You haven't started any consultations yet"
                                            icon="📋"
                                        />
                                    )}
                                <div className="grid gap-4">
                                    {myConsultations.data
                                        ?.filter((c) => c.status !== "Completed")
                                        .map((consultation) => (
                                            <ConsultationCard
                                                key={consultation.$id}
                                                consultation={consultation}
                                            />
                                        ))}
                                </div>
                            </div>
                        )}

                        {/* Completed Tab */}
                        {activeTab === "completed" && (
                            <div>
                                {myConsultations.loading && <LoadingSkeleton rows={4} />}
                                {myConsultations.error &&
                                    !dismissedErrors.includes("completed") && (
                                        <ErrorAlert
                                            error={myConsultations.error}
                                            onDismiss={() =>
                                                setDismissedErrors([...dismissedErrors, "completed"])
                                            }
                                        />
                                    )}
                                {!myConsultations.loading &&
                                    myConsultations.data?.filter((c) => c.status === "Completed")
                                        .length === 0 && (
                                        <EmptyState
                                            title="No Completed Consultations"
                                            description="Completed consultations will appear here"
                                            icon="✓"
                                        />
                                    )}
                                <div className="grid gap-4">
                                    {myConsultations.data
                                        ?.filter((c) => c.status === "Completed")
                                        .map((consultation) => (
                                            <ConsultationCard
                                                key={consultation.$id}
                                                consultation={consultation}
                                            />
                                        ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashBoardComponent;
