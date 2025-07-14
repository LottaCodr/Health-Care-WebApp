'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { BellIcon, BarChart2, FilterIcon } from 'lucide-react';
import PrescriptionTable from './component/dashboard-comp/prescription-table';
import DispensedHistoryTable from './component/dashboard-comp/dispense-history-table';
import { useQueryPrescriptions } from '@/actions/pharmacy/hook/useQueryPrescriptions';

const stats = [
    {
        title: 'Pending Requests',
        value: 8,
        icon: <BarChart2 className="w-5 h-5 text-blue-600" />,
        href: '/pharmacy/medication-requests',
    },
    {
        title: 'Today’s Dispenses',
        value: 42,
        icon: <BarChart2 className="w-5 h-5 text-green-600" />,
        href: '/pharmacy/dispenses',
    },
    {
        title: 'Patient Queue',
        value: 5,
        icon: <BarChart2 className="w-5 h-5 text-yellow-600" />,
        href: '/pharmacy/queue',
    },
    {
        title: 'Ward Round Notes',
        value: 3,
        icon: <BarChart2 className="w-5 h-5 text-purple-600" />,
        href: '/pharmacy/ward-rounds',
    },
];

const activityLog = [
    { action: 'Dispensed Paracetamol 500mg to John Doe', time: '2 mins ago' },
    { action: 'Approved medication request for Ibuprofen', time: '10 mins ago' },
    { action: 'Updated ward round notes for Ward B', time: '1 hr ago' },
];


export default function PharmacyDashboard() {
    const { data: prescriptions, isLoading } = useQueryPrescriptions();
    console.log(prescriptions);
    const pendingPrescriptions = prescriptions?.filter((prescription) => prescription.status === 'pending');
    const drugsDispensed = prescriptions?.filter((prescription) => prescription.status === 'dispensed');

    return (
        <div className="p-4 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-800">Pharmacy Dashboard</h1>
                <div className="flex items-center gap-2">
                    <Button variant="outline">
                        <FilterIcon className="mr-2 h-4 w-4" /> Filters
                    </Button>
                    <Button variant="ghost" className="relative">
                        <BellIcon className="h-5 w-5 text-gray-700" />
                        <span className="absolute top-0 right-0 inline-flex h-2 w-2 rounded-full bg-red-600"></span>
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat) => (
                    <Card key={stat.title} className="hover:shadow-md transition">
                        <CardHeader className="flex items-center justify-between">
                            <CardTitle className="text-base font-medium text-gray-700">{stat.title}</CardTitle>
                            {stat.icon}
                        </CardHeader>
                        <CardContent>

                        </CardContent>
                    </Card>
                ))}
            </div>

            <Tabs defaultValue="myPatients" className="w-full">
                <TabsList className="mb-4">
                    <TabsTrigger value="myPatients">My Patients</TabsTrigger>
                    <TabsTrigger value="recentlyDispensed">Recently Dispensed</TabsTrigger>
                </TabsList>


                <TabsContent value="myPatients">
                    <h2 className="text-lg font-semibold text-gray-700">My Patients</h2>
                    <p className="text-sm text-gray-500">
                        These are the patients that you are currently attending to.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card className="p-4">
                            <PrescriptionTable
                                isLoading={isLoading}
                                data={pendingPrescriptions || []} />
                            
                        </Card>

                    </div>

                </TabsContent>

                <TabsContent value="recentlyDispensed">
                    <h2 className="text-lg font-semibold text-gray-700">Recently dispensed</h2>
                    <p className="text-sm text-gray-500">
                        These are the patients that you have recently dispensed.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card className="p-4">
                            <DispensedHistoryTable data={drugsDispensed || []} />
                        </Card>
                    </div>

                </TabsContent>
                {/* 
                <TabsContent value="logs">
                    <Card className="p-4 space-y-3">
                        <h2 className="text-lg font-semibold text-gray-700">Activity Log</h2>
                        {activityLog.map((log, i) => (
                            <div key={i} className="flex items-start justify-between border-b pb-2">
                                <span className="text-sm text-gray-800">{log.action}</span>
                                <Badge variant="outline" className="text-xs text-gray-500">
                                    {log.time}
                                </Badge>
                            </div>
                        ))}
                    </Card>
                </TabsContent> */}
            </Tabs>
        </div>
    );
}
