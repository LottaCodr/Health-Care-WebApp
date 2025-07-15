'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
        icon: <BarChart2 className="w-5 h-5 text-red-600" />,
        href: '/pharmacy/medication-requests',
        color: 'bg-gradient-to-r from-red-100 to-red-50 text-red-700',
        border: 'border-red-200'
    },
    {
        title: 'Today’s Dispenses',
        value: 42,
        icon: <BarChart2 className="w-5 h-5 text-red-400" />,
        href: '/pharmacy/dispenses',
        color: 'bg-gradient-to-r from-red-50 to-white text-red-500',
        border: 'border-red-100'
    },
    {
        title: 'Patient Queue',
        value: 5,
        icon: <BarChart2 className="w-5 h-5 text-red-300" />,
        href: '/pharmacy/queue',
        color: 'bg-gradient-to-r from-red-50 to-white text-red-400',
        border: 'border-red-100'
    },
    {
        title: 'Ward Round Notes',
        value: 3,
        icon: <BarChart2 className="w-5 h-5 text-red-200" />,
        href: '/pharmacy/ward-rounds',
        color: 'bg-gradient-to-r from-red-50 to-white text-red-300',
        border: 'border-red-100'
    },
];

export default function PharmacyDashboard() {
    const { data: prescriptions, isLoading } = useQueryPrescriptions();
    const pendingPrescriptions = prescriptions?.filter((prescription) => prescription.status === 'pending');
    const drugsDispensed = prescriptions?.filter((prescription) => prescription.status === 'dispensed');

    return (
        <div className="p-4 sm:p-8 space-y-10 bg-gradient-to-br from-red-50 via-white to-red-100 min-h-screen">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-4xl font-extrabold text-red-700 tracking-tight flex items-center gap-3 drop-shadow-sm">
                    <span className="inline-flex items-center justify-center rounded-xl bg-red-100 p-2 shadow">
                        <BarChart2 className="w-8 h-8 text-red-500" />
                    </span>
                    Pharmacy Dashboard
                </h1>
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        className="border-2 border-red-300 text-red-700 hover:bg-red-100 hover:border-red-400 transition-all font-semibold flex items-center gap-2 shadow"
                    >
                        <FilterIcon className="mr-2 h-4 w-4" /> Filters
                    </Button>
                    <Button
                        variant="ghost"
                        className="relative hover:bg-red-100 transition-all p-2 rounded-full"
                        aria-label="Notifications"
                    >
                        <BellIcon className="h-6 w-6 text-red-600" />
                        <span className="absolute top-1 right-1 inline-flex h-3 w-3 rounded-full bg-red-600 border-2 border-white animate-pulse"></span>
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat) => (
                    <a
                        key={stat.title}
                        href={stat.href}
                        className="group block focus:outline-none focus:ring-2 focus:ring-red-400 rounded-xl transition-transform hover:-translate-y-1"
                        tabIndex={0}
                        aria-label={stat.title}
                    >
                        <Card className={`border-2 ${stat.border} shadow-md group-hover:shadow-xl transition rounded-xl bg-white`}>
                            <CardHeader className="flex items-center justify-between pb-2">
                                <CardTitle className={`text-base font-semibold ${stat.color} flex items-center gap-2`}>
                                    {stat.icon}
                                    {stat.title}
                                </CardTitle>
                                <div className="rounded-full p-2 bg-white shadow group-hover:bg-red-50 transition">
                                    <span className="sr-only">{stat.title} icon</span>
                                    {stat.icon}
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-4xl font-extrabold text-red-700 group-hover:text-red-600 transition drop-shadow">
                                    {stat.value}
                                </div>
                            </CardContent>
                        </Card>
                    </a>
                ))}
            </div>

            {/* Tabs Section */}
            <Tabs defaultValue="myPatients" className="w-full">
                <TabsList className="mb-8 flex gap-2 bg-white rounded-xl p-2 shadow border-2 border-red-100">
                    <TabsTrigger 
                        value="myPatients" 
                        className="flex-1 px-6 py-3 rounded-lg data-[state=active]:bg-red-100 data-[state=active]:text-red-700 transition font-bold text-base focus:outline-none focus:ring-2 focus:ring-red-400"
                    >
                        <span className="flex items-center gap-2">
                            <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
                            My Patients
                        </span>
                    </TabsTrigger>
                    <TabsTrigger 
                        value="recentlyDispensed" 
                        className="flex-1 px-6 py-3 rounded-lg data-[state=active]:bg-red-50 data-[state=active]:text-red-600 transition font-bold text-base focus:outline-none focus:ring-2 focus:ring-red-400"
                    >
                        <span className="flex items-center gap-2">
                            <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-400"></span>
                            Recently Dispensed
                        </span>
                    </TabsTrigger>
                </TabsList>

                {/* My Patients Tab */}
                <TabsContent value="myPatients">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-xl font-bold text-red-700 flex items-center gap-2">
                            <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500"></span>
                            My Patients
                        </h2>
                        <span className="text-xs bg-red-100 text-red-700 px-3 py-1.5 rounded-full font-semibold shadow-sm">
                            {pendingPrescriptions?.length ?? 0} Pending
                        </span>
                    </div>
                    <p className="text-base text-gray-500 mb-5">
                        These are the patients that you are currently attending to. Click on a row for more details or to dispense.
                    </p>
                    <div className="w-full">
                        <Card className="p-0 w-full shadow-lg border-2 border-red-100 rounded-2xl">
                            <PrescriptionTable
                                isLoading={isLoading}
                                data={
                                    (pendingPrescriptions || []).map((doc: any) => ({
                                        id: doc.id,
                                        pharmacistId: doc.pharmacistId ?? "",
                                        patientId: doc.patientId ?? "",
                                        doctorInstructions: doc.doctorInstructions ?? "",
                                        doctorPrescription: doc.doctorPrescription ?? "",
                                        status: doc.status ?? "",
                                        // Copy any other PharmacyRecord fields as needed
                                        ...doc,
                                    }))
                                }
                            />
                        </Card>
                    </div>
                </TabsContent>

                {/* Recently Dispensed Tab */}
                <TabsContent value="recentlyDispensed">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-xl font-bold text-red-700 flex items-center gap-2">
                            <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-400"></span>
                            Recently Dispensed
                        </h2>
                        <span className="text-xs bg-red-50 text-red-600 px-3 py-1.5 rounded-full font-semibold shadow-sm">
                            {drugsDispensed?.length ?? 0} Dispensed
                        </span>
                    </div>
                    <p className="text-base text-gray-500 mb-5">
                        These are the patients that you have recently dispensed. Review the history for accuracy.
                    </p>
                    <div className="w-full">
                        <Card className="p-0 w-full shadow-lg border-2 border-red-100 rounded-2xl">
                            <DispensedHistoryTable data={drugsDispensed || []} />
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
