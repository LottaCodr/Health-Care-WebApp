"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FaPills, FaFlask, FaCalendarAlt, FaNotesMedical } from "react-icons/fa";
import { MdAssignment, MdCheckCircle, MdOutlineEventNote, MdWarning } from "react-icons/md";
import ConsultationHistoryTable from "./consultation-history";
import VitalsAdCheckInComponent from "@/components/nurse/component/vitals-checkin";
import PrescriptionDetails from "./prescription-details";
import PrescriptionHistory from "./prescription-history";
import { useAuth } from "@/context/auth-provider";
import ConsultationForm from "./consultation-form";
import { useConsultationContext } from "@/context/consultation/consultation";
import { usePatientContext } from "@/context/patients/patient-context";
import { ConsultationReferred } from "@/actions/consultations/types";
import { Patient, PatientStatus } from "@/context/patients/types";
import { toast } from "@/hooks/use-toast";
import { databases } from "@/lib/appwrite.config";
import { createConsultation } from "@/actions/consultations/consultation";
import { getAllStaffs } from "@/actions/staff/get.staff";
import { useQuery } from "@tanstack/react-query";
import { Staff } from "@/actions/staff/types";


const databaseId = process.env.NEXT_PUBLIC_DATABASE_ID!;
const patientCollectionId = process.env.NEXT_PUBLIC_PATIENT_COLLECTION_ID!;

export default function PatientDetailTabs({ patient }: { patient: Patient }) {
    const [tab, setTab] = useState("consultation");
    const { state: consultationState, dispatch: consultationDispatch } = useConsultationContext();
    const { state: patientState, dispatch: patientDispatch } = usePatientContext();
    const [formError, setFormError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null)
    const formRef = useRef<HTMLDivElement>(null)
    const { user } = useAuth();

    const { data: staff = [], isPending, isError, refetch } = useQuery({
        queryKey: ["staffs"],
        queryFn: getAllStaffs,
    });


    // Memoize available staff for the selected referral type
    const availableStaff = useMemo(
        () =>
            staff.filter(
                (s: Staff) =>
                    s.role &&
                    consultationState.referredTo &&
                    s.role.toLowerCase() === consultationState.referredTo
            ),
        [staff, consultationState.referredTo]
    );

    const [selectedStaffId, setSelectedStaffId] = useState<string | undefined>(undefined);


    // Initialize patient and consultation state only when patient changes
    useEffect(() => {
        if (patient) {
            patientDispatch({ type: "SET_PATIENT", payload: [patient] });
            patientDispatch({ type: "UPDATE_NOTES", payload: patient.notes || "" });
            patientDispatch({ type: "SET_STATUS", payload: (patient.status as PatientStatus) || "no-status" });
            consultationDispatch({ type: "RESET_FORM" });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [patient]);

    // Clear error/success messages after a timeout
    useEffect(() => {
        if (formError) {
            const t = setTimeout(() => setFormError(null), 5000);
            return () => clearTimeout(t);
        }
    }, [formError]);
    useEffect(() => {
        if (successMessage) {
            const t = setTimeout(() => setSuccessMessage(null), 4000);
            return () => clearTimeout(t);
        }
    }, [successMessage]);



    // Scroll to first error field
    const scrollToFirstError = useCallback(() => {
        if (formRef.current) {
            const firstInvalid = formRef.current.querySelector("[aria-invalid='true']");
            if (firstInvalid) {
                (firstInvalid as HTMLElement).focus();
            }
        }
    }, []);

    const getMissingFields = useCallback((): string[] => {
        const missing: string[] = [];
        if (!patientState.status || patientState.status === "no-status") missing.push("Status");
        if (!consultationState.symptoms.trim()) missing.push("Symptoms");
        if (!consultationState.diagnosis.trim()) missing.push("Diagnosis");
        if (!consultationState.prescriptions.trim()) missing.push("Prescriptions");
        if (!consultationState.recommendations.trim()) missing.push("Recommendations");
        if (!consultationState.referredTo) missing.push("Referred To");
        if (!selectedStaffId) missing.push("Staff Assignment");
        return missing;
    }, [
        patientState.status,
        consultationState.symptoms,
        consultationState.diagnosis,
        consultationState.prescriptions,
        consultationState.recommendations,
        consultationState.referredTo,
        selectedStaffId,
    ]);


    const handleSubmit = useCallback(async () => {
        setFormError(null);
        setSuccessMessage(null);

        const missingFields = getMissingFields();

        if (missingFields.length > 0) {
            const msg = `Please complete: ${missingFields.join(", ")}.`;
            setFormError(msg);
            toast({
                variant: "destructive",
                title: "Missing Fields",
                description: msg,
            });
            scrollToFirstError();
            return;
        }

        try {
            consultationDispatch({ type: "SET_LOADING", payload: true });

            // Update patient status only if changed
            if (patientState.status !== patient.status) {
                await databases.updateDocument(databaseId, patientCollectionId, patient.id!, {
                    status: patientState.status,
                });
            }

            await createConsultation({
                patientId: patient.id!,
                doctorId: user?.id!,
                symptom: consultationState.symptoms,
                diagnosis: consultationState.diagnosis,
                prescription: consultationState.prescriptions,
                recommendation: consultationState.recommendations,
                consultationDate: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                referredTo: consultationState.referredTo,
            });



            setSuccessMessage("Consultation and task successfully assigned.");
            toast({
                variant: "default",
                title: "Success",
                description: `Consultation Completed. You can view the updated status in the patient’s record.`,
                duration: 5000,
            });

            consultationDispatch({ type: "RESET_FORM" });
            setSelectedStaffId(undefined);
        } catch (error) {
            console.error(error);
            setFormError("Failed to save consultation.");
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to save consultation. Please try again or contact support if the issue persists.",
                duration: 7000,
            });
        } finally {
            consultationDispatch({ type: "SET_LOADING", payload: false });
        }
    }, [
        consultationDispatch,
        consultationState.diagnosis,
        consultationState.prescriptions,
        consultationState.recommendations,
        consultationState.referredTo,
        consultationState.symptoms,
        user?.id,
        getMissingFields,
        patient.id,
        patient.status,
        patientState.status,
        scrollToFirstError,
        selectedStaffId,
        staff,
    ]);

    return (
        <Tabs value={tab} onValueChange={setTab} className="w-full">
            <TabsList className="flex gap-2  dark:bg-muted/80 rounded-xl p-1.5 mb-6 w-full max-w-fit mx-auto shadow-md">

                <TabsTrigger
                    value="vitals-recording"
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary/70 data-[state=active]:bg-primary text-primary data-[state=active]:text-white data-[state=active]:shadow data-[state=active]:font-bold data-[state=active]:scale-105`}
                    aria-label="vitals-recording"
                >
                    <FaCalendarAlt className="text-lg" />
                    <span className="hidden sm:inline">Vitals Recording</span>
                </TabsTrigger>
                <TabsTrigger
                    value="consultations"
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-primary transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary/70 data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow data-[state=active]:font-bold data-[state=active]:scale-105`}
                    aria-label="Notes"
                >
                    <FaNotesMedical className="text-lg" />
                    <span className="hidden sm:inline">Consultations</span>
                </TabsTrigger>
                <TabsTrigger
                    value="prescriptions"
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary/70 data-[state=active]:bg-primary text-primary data-[state=active]:text-white data-[state=active]:shadow data-[state=active]:font-bold data-[state=active]:scale-105`}
                    aria-label="Prescriptions"
                >
                    <FaPills className="text-lg" />
                    <span className="hidden sm:inline">Prescriptions</span>
                </TabsTrigger>
                <TabsTrigger
                    value="lab"
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary/70 data-[state=active]:bg-primary text-primary data-[state=active]:text-white data-[state=active]:shadow data-[state=active]:font-bold data-[state=active]:scale-105`}
                    aria-label="Lab Results"
                >
                    <FaFlask className="text-lg" />
                    <span className="hidden sm:inline">Lab Results</span>
                </TabsTrigger>
            </TabsList>



            {/* Appointments Tab */}
            <TabsContent value="vitals-recording">
                <Card className=" text-black">
                    <CardHeader>
                        <CardTitle>Vitals Recording</CardTitle>
                    </CardHeader>
                    <CardContent>

                        <div className="grid justify-center h-full grid-cols-1 md:grid-cols-2 gap-8 w-full items-start">

                            <div className="text-black">No vitals recording yet.</div>
                            {user?.role === "Nurse" ?

                                <VitalsAdCheckInComponent />
                                : ""}
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>

            {/* Prescriptions Tab */}
            <TabsContent value="prescriptions">

                <CardContent className="pt-0">
                    <div className="grid justify-center h-full grid-cols-1 md:grid-cols-2 gap-8 w-full items-start">
                        {user?.role === "Pharmacist" ? (<div>
                            <PrescriptionDetails />
                        </div>) : ""}
                        <div>
                            <PrescriptionHistory />
                        </div>
                    </div>
                </CardContent>
                {/* </Card> */}
            </TabsContent>

            {/* Lab Results Tab */}
            <TabsContent value="lab">
                <Card className="text-black">
                    <CardHeader>
                        <CardTitle>Lab Results</CardTitle>
                    </CardHeader>

                    <CardContent className="pt-0">
                        <div className="grid justify-center h-full grid-cols-1 md:grid-cols-2 gap-8 w-full items-start">
                            {user?.role === "LabTechnician" ? (<div>
                                <PrescriptionDetails />
                            </div>) : ""}
                            <div>
                                <div className="text-black">No Lab Recordings yet.</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>

            {/* Consultations */}
            <TabsContent value="consultations">
                <Card className="text-black">
                    <CardHeader>
                        {user?.role === "Doctor" ?
                            <CardHeader className="pb-2 border-b flex items-center justify-between">
                                <CardTitle className="text-2xl font-semibold text-black flex items-center gap-2">
                                    <MdAssignment className="text-blue-900" /> New Consultation
                                </CardTitle>

                            </CardHeader>

                            : ""}
                    </CardHeader>

                    {user?.role === "Doctor" ? (
                        <CardContent className="pt-6" ref={formRef}>
                            {formError && (
                                <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 flex items-center gap-2">
                                    <MdWarning className="text-xl" />
                                    <span>{formError}</span>
                                </div>
                            )}
                            {successMessage && (
                                <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 flex items-center gap-2">
                                    <MdCheckCircle className="text-xl" />
                                    <span>{successMessage}</span>
                                </div>
                            )}

                            <ConsultationForm
                                symptoms={consultationState.symptoms}
                                diagnosis={consultationState.diagnosis}
                                prescriptions={consultationState.prescriptions}
                                recommendations={consultationState.recommendations}
                                referredTo={consultationState.referredTo}
                                status={patientState.status}
                                onSymptomsChange={(val) => consultationDispatch({ type: "SET_SYMPTOMS", payload: val })}
                                onDiagnosisChange={(val) => consultationDispatch({ type: "SET_DIAGNOSIS", payload: val })}
                                onPrescriptionsChange={(val) => consultationDispatch({ type: "SET_PRESCRIPTIONS", payload: val })}
                                onRecommendationsChange={(val) => consultationDispatch({ type: "SET_RECOMMENDATIONS", payload: val })}
                                onReferredToChange={(val) => consultationDispatch({ type: "SET_REFERRED_TO", payload: val as ConsultationReferred })}
                                onStatusChange={(status) => patientDispatch({ type: "SET_STATUS", payload: status as PatientStatus })}
                                onSubmit={handleSubmit}
                                loading={consultationState.loading}
                                selectedStaffId={selectedStaffId}
                                availableStaff={availableStaff}
                                onStaffSelect={setSelectedStaffId}
                            />
                        </CardContent>
                    ) : ""}

                    <ConsultationHistoryTable patientId={patient?.id!} />

                </Card>
            </TabsContent>

        </Tabs>
    )

}

