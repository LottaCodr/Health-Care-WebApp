"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FaPills, FaFlask, FaCalendarAlt, FaNotesMedical } from "react-icons/fa";
import { MdOutlineEventNote } from "react-icons/md";
import ConsultationHistoryTable from "./consultation-history";
import VitalsAdCheckInComponent from "@/components/nurse/component/vitals-checkin";
import PrescriptionDetails from "./prescription-details";
import PrescriptionHistory from "./prescription-history";

export default function PatientDetailTabs() {
    const [tab, setTab] = useState("overview");

    return (
        <Tabs value={tab} onValueChange={setTab} className="w-full">
            <TabsList className="flex gap-2  dark:bg-muted/80 rounded-xl p-1.5 mb-6 w-full max-w-fit mx-auto shadow-md">
                <TabsTrigger
                    value="overview"
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary/70 data-[state=active]:bg-primary text-primary data-[state=active]:text-white data-[state=active]:shadow data-[state=active]:font-bold data-[state=active]:scale-105`}
                    aria-label="Patient Overview"
                >
                    <MdOutlineEventNote className="text-lg" />
                    <span className="hidden sm:inline">Overview</span>
                </TabsTrigger>
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

            {/* Overview Tab */}
            <TabsContent value="overview">
                <Card className="bg-white text-black">
                    <CardHeader>
                        <CardTitle>Patient Summary</CardTitle>
                        <p className="text-gray-400 text-sm">
                            Overview of patient’s health status and recent activities.
                        </p>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Next Appointment */}
                            <div className=" rounded-lg p-4">
                                <div className="font-semibold text-gray-600 mb-2">Next Appointment</div>
                                <div className="text-lg font-bold">April 20, 2024</div>
                                <div className="text-black text-sm">Dr. Sarah Munson</div>
                            </div>
                            {/* Active Medications */}
                            <div className=" rounded-lg p-4">
                                <div className="font-semibold text-gray-600 mb-2">Active Medications</div>
                                <div className="text-lg font-bold">3 Active Prescriptions</div>
                                <Button variant="link" className="p-0 h-auto text-primary underline text-sm mt-1">
                                    View all medications
                                </Button>
                            </div>
                            {/* Recent Lab Results */}
                            <div className=" rounded-lg p-4">
                                <div className="font-semibold text-gray-600 mb-2">Recent Lab Results</div>
                                <div className="text-lg font-bold">Comprehensive Metabolic Panel</div>
                                <Button variant="link" className="p-0 h-auto text-primary underline text-sm mt-1">
                                    View results
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>

            {/* Appointments Tab */}
            <TabsContent value="vitals-recording">
                <Card className=" text-black">
                    <CardHeader>
                        <CardTitle>Vitals Recording</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {/* <div className="text-black">No vitals recording yet.</div> */}
                        <VitalsAdCheckInComponent />
                    </CardContent>
                </Card>
            </TabsContent>

            {/* Prescriptions Tab */}
            <TabsContent value="prescriptions">
                {/* <Card className=" text-black"> */}
                    {/* <CardHeader>
                        <CardTitle>Prescriptions</CardTitle>
                    </CardHeader> */}
                    <CardContent className="pt-0">
                        <div className="grid justify-center h-full grid-cols-1 md:grid-cols-2 gap-8 w-full items-start">
                            <div>
                                <PrescriptionDetails />
                            </div>
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
                </Card>
            </TabsContent>

            {/* Consultations */}
            <TabsContent value="consultations">
                <Card className="text-black">
                    <CardHeader>
                        <CardTitle>Consultations</CardTitle>
                    </CardHeader>

                    <ConsultationHistoryTable patientId={"998798997979878897"} />

                </Card>
            </TabsContent>

        </Tabs>
    )

}

