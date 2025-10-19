'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { FaUserDoctor, FaUserNurse, FaHospitalUser } from 'react-icons/fa6';

import { getAllPatients } from '@/actions/front-desk/get.patients';
import { fetchAppointments } from '@/actions/appointments/appointment.action';
import { useAuth } from '@/context/auth-provider';
import NurseStatCardsSection from './nurse-stat';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import RecentPatients from './patient-record/recent-patients';
import RecentVitalsRecording from './patient-record/recent-vitals-recording';

const personalizedGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
};


export default function NurseDashboardComponent() {
    const { user } = useAuth();

    const formattedRole = user?.role
        ? user?.role.charAt(0).toUpperCase() + user?.role.slice(1)
        : "Staff";

   
   
   
    return (
        <div className="p-6 md:p-10 space-y-8 min-h-screen rounded-3xl">
            {/* Greeting */}
            <header className="space-y-2">
                <h1 className="text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">
                    {personalizedGreeting()}, {formattedRole} {user?.name || ""}
                </h1>
                <p className="text-base text-gray-600">
                    Here's what's happening with your patients today.
                </p>
            </header>

            {/* Dashboard Cards */}
            <section>

                <NurseStatCardsSection />


            </section>

            <section className="mt-8">
                <Tabs defaultValue="patients" className="w-full">
                    <TabsList className="bg-transparent border-gray-700 rounded-none px-0">

                        <TabsTrigger
                            value="patients"
                            className="px-4 py-2 text-sm font-medium data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary border-b-2 border-transparent text-gray-300"
                        >
                            Patients
                        </TabsTrigger>
                        <TabsTrigger
                            value="vitals"
                            className="px-4 py-2 text-sm font-medium data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary border-b-2 border-transparent text-gray-300"
                        >
                            Vitals Recording
                        </TabsTrigger>

                    </TabsList>

                    <TabsContent value="patients">
                        {/* <div className="py-4 text-gray-400">Patients content goes here.</div> */}
                        <RecentPatients />
                    </TabsContent>
                    <TabsContent value="vitals">
                        <div className="py-4  w-full items-start">

                            <RecentVitalsRecording />

                        </div>
                    </TabsContent>

                </Tabs>
            </section>

        </div>
    );
}
