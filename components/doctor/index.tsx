import React from 'react';
import StatCardsSection from './dashboard/statcard';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import PendingTasks from './components/tasks';
import RecentPrescriptions from './components/recent-prescription';
import RecentPatients from './components/recent-patients';



const DashBoardComponent = () => {
    return (
        <main className="">



            <StatCardsSection />

           

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
                            value="tasks"
                            className="px-4 py-2 text-sm font-medium data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary border-b-2 border-transparent text-gray-300"
                        >
                            Tasks
                        </TabsTrigger>

                    </TabsList>
                    {/* Example Tab Content */}
                    <TabsContent value="schedule">
                        {/* Replace with actual content */}
                        <div className="py-4 text-gray-400">Schedule content goes here.</div>
                    </TabsContent>
                    <TabsContent value="patients">
                        {/* <div className="py-4 text-gray-400">Patients content goes here.</div> */}

                        <RecentPatients />
                    </TabsContent>
                    <TabsContent value="tasks">
                        <div className="py-4  w-full items-start">

                            < PendingTasks />
                            <RecentPrescriptions />

                        </div>
                    </TabsContent>

                </Tabs>
            </section>


        </main>
    );
};

export default DashBoardComponent;
