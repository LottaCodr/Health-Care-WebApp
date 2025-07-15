'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { BellIcon, BarChart2, FilterIcon } from 'lucide-react';
import PrescriptionTable from './component/dashboard-comp/prescription-table';
import DispensedHistoryTable from './component/dashboard-comp/dispense-history-table';
import { useQueryPrescriptions } from '@/actions/pharmacy/hook/useQueryPrescriptions';
import React, { useState } from 'react';

// Improved: Dynamic stats, animated numbers, tooltips, and better color contrast
const statIcons = [
    <BarChart2 className="w-6 h-6 text-red-600" />,
    <BarChart2 className="w-6 h-6 text-red-400" />,
    <BarChart2 className="w-6 h-6 text-red-300" />,
    <BarChart2 className="w-6 h-6 text-red-200" />,
];

const statColors = [
    'bg-gradient-to-r from-red-100 to-red-50 text-red-700',
    'bg-gradient-to-r from-red-50 to-white text-red-500',
    'bg-gradient-to-r from-red-50 to-white text-red-400',
    'bg-gradient-to-r from-red-50 to-white text-red-300',
];

const statBorders = [
    'border-red-200',
    'border-red-100',
    'border-red-100',
    'border-red-100',
];

const statHrefs = [
    '/pharmacy/medication-requests',
    '/pharmacy/dispenses',
    '/pharmacy/queue',
    '/pharmacy/ward-rounds',
];

const statTitles = [
    'Pending Requests',
    'Today’s Dispenses',
    'Patient Queue',
    'Ward Round Notes',
];

function StatCard({ title, value, icon, color, border, href, tooltip }: any) {
    return (
        <a
            href={href}
            className="group block focus:outline-none focus:ring-2 focus:ring-red-400 rounded-2xl transition-transform hover:-translate-y-1"
            tabIndex={0}
            aria-label={title}
        >
            <Card className={`border-2 ${border} shadow-lg group-hover:shadow-2xl transition rounded-2xl bg-white`}>
                <CardHeader className="flex items-center justify-between pb-3">
                    <CardTitle className={`text-lg font-semibold ${color} flex items-center gap-3`}>
                        {icon}
                        {title}
                    </CardTitle>
                    <div className="rounded-full p-3 bg-white shadow group-hover:bg-red-50 transition">
                        <span className="sr-only">{title} icon</span>
                        {icon}
                    </div>
                </CardHeader>
                <CardContent>
                    <div
                        className="text-5xl font-extrabold text-red-700 group-hover:text-red-600 transition drop-shadow relative"
                        title={tooltip}
                    >
                        {value}
                        {tooltip && (
                            <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition pointer-events-none z-20">
                                {tooltip}
                            </span>
                        )}
                    </div>
                </CardContent>
            </Card>
        </a>
    );
}

function AnimatedNumber({ value }: { value: number }) {
    const [display, setDisplay] = useState(0);
    React.useEffect(() => {
        let start = 0;
        const end = value;
        if (start === end) return;
        let increment = end > start ? 1 : -1;
        let stepTime = Math.abs(Math.floor(800 / (end - start || 1)));
        let timer = setInterval(() => {
            start += increment;
            setDisplay(start);
            if (start === end) clearInterval(timer);
        }, stepTime);
        return () => clearInterval(timer);
    }, [value]);
    return <span>{display}</span>;
}

function PharmacyDashboardContent() {
    const { data: prescriptions, isLoading } = useQueryPrescriptions();
    const pendingPrescriptions = prescriptions?.filter((prescription) => prescription.status === 'pending') || [];
    const drugsDispensed = prescriptions?.filter((prescription) => prescription.status === 'dispensed') || [];
    const patientQueue = prescriptions?.filter((prescription) => prescription.status === 'queued') || [];
    const wardNotes = prescriptions?.filter((prescription) => prescription.wardNote) || [];

    // Improved: Dynamic stats
    const stats = [
        {
            title: 'Pending Requests',
            value: pendingPrescriptions.length,
            icon: statIcons[0],
            href: statHrefs[0],
            color: statColors[0],
            border: statBorders[0],
            tooltip: 'Prescriptions waiting for your action',
        },
        {
            title: 'Today’s Dispenses',
            value: drugsDispensed.length,
            icon: statIcons[1],
            href: statHrefs[1],
            color: statColors[1],
            border: statBorders[1],
            tooltip: 'Total medications dispensed today',
        },
        {
            title: 'Patient Queue',
            value: patientQueue.length,
            icon: statIcons[2],
            href: statHrefs[2],
            color: statColors[2],
            border: statBorders[2],
            tooltip: 'Patients waiting in the queue',
        },
        {
            title: 'Ward Round Notes',
            value: wardNotes.length,
            icon: statIcons[3],
            href: statHrefs[3],
            color: statColors[3],
            border: statBorders[3],
            tooltip: 'Notes from recent ward rounds',
        },
    ];

    // Improved: Responsive, sticky header, subtle background, better spacing
    return (
        <div className="p-2 sm:p-6 md:p-10 space-y-12 bg-gradient-to-br from-red-50 via-white to-red-100 min-h-screen flex justify-center">
            <div className="w-full max-w-[1800px] mx-auto flex flex-col gap-12">
                {/* Header */}
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 sticky top-0 z-20 bg-gradient-to-r from-white/90 to-red-50/80 backdrop-blur-md py-4 px-2 rounded-2xl shadow-sm">
                    <h1 className="text-4xl sm:text-5xl font-extrabold text-red-700 tracking-tight flex items-center gap-4 drop-shadow-sm">
                        <span className="inline-flex items-center justify-center rounded-2xl bg-red-100 p-3 shadow">
                            <BarChart2 className="w-10 h-10 text-red-500" />
                        </span>
                        <span className="whitespace-nowrap">Pharmacy Dashboard</span>
                    </h1>
                    <div className="flex items-center gap-4">
                        <Button
                            variant="outline"
                            className="border-2 border-red-300 text-red-700 hover:bg-red-100 hover:border-red-400 transition-all font-semibold flex items-center gap-2 shadow px-6 py-3 text-lg"
                            aria-label="Filter prescriptions"
                        >
                            <FilterIcon className="mr-2 h-5 w-5" /> Filters
                        </Button>
                        <Button
                            variant="ghost"
                            className="relative hover:bg-red-100 transition-all p-3 rounded-full"
                            aria-label="Notifications"
                        >
                            <BellIcon className="h-7 w-7 text-red-600" />
                            <span className="absolute top-1 right-1 inline-flex h-3.5 w-3.5 rounded-full bg-red-600 border-2 border-white animate-pulse"></span>
                        </Button>
                    </div>
                </header>

                {/* Stats Cards */}
                <section aria-label="Pharmacy statistics" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-8 w-full">
                    {stats.map((stat) => (
                        <StatCard
                            key={stat.title}
                            title={stat.title}
                            value={<AnimatedNumber value={stat.value} />}
                            icon={stat.icon}
                            color={stat.color}
                            border={stat.border}
                            href={stat.href}
                            tooltip={stat.tooltip}
                        />
                    ))}
                </section>

                {/* Tabs Section */}
                <Tabs defaultValue="myPatients" className="w-full">
                    <TabsList className="mb-10 flex gap-4 bg-white rounded-2xl p-4 shadow border-2 border-red-100 w-full sticky top-24 z-10">
                        <TabsTrigger
                            value="myPatients"
                            className="flex-1 px-10 py-4 rounded-xl data-[state=active]:bg-red-100 data-[state=active]:text-red-700 transition font-bold text-lg focus:outline-none focus:ring-2 focus:ring-red-400"
                        >
                            <span className="flex items-center gap-3">
                                <span className="inline-block w-3 h-3 rounded-full bg-red-500 animate-pulse"></span>
                                My Patients
                            </span>
                        </TabsTrigger>
                        <TabsTrigger
                            value="recentlyDispensed"
                            className="flex-1 px-10 py-4 rounded-xl data-[state=active]:bg-red-50 data-[state=active]:text-red-600 transition font-bold text-lg focus:outline-none focus:ring-2 focus:ring-red-400"
                        >
                            <span className="flex items-center gap-3">
                                <span className="inline-block w-3 h-3 rounded-full bg-red-400"></span>
                                Recently Dispensed
                            </span>
                        </TabsTrigger>
                    </TabsList>

                    {/* My Patients Tab */}
                    <TabsContent value="myPatients">
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-5 gap-3">
                            <h2 className="text-2xl font-bold text-red-700 flex items-center gap-3">
                                <span className="inline-block w-3 h-3 rounded-full bg-red-500"></span>
                                My Patients
                            </h2>
                            <span className="text-sm bg-red-100 text-red-700 px-4 py-2 rounded-full font-semibold shadow-sm">
                                {pendingPrescriptions.length} Pending
                            </span>
                        </div>
                        <p className="text-lg text-gray-500 mb-6">
                            These are the patients you are currently attending to. Click on a row for more details or to dispense.
                        </p>
                        <div className="w-full">
                            <Card className="p-0 w-full shadow-xl border-2 border-red-100 rounded-2xl overflow-x-auto">
                                <div className="min-w-[900px]">
                                    <PrescriptionTable
                                        isLoading={isLoading}
                                        data={
                                            pendingPrescriptions.map((doc: any) => ({
                                                id: doc.id,
                                                pharmacistId: doc.pharmacistId ?? "",
                                                patientId: doc.patientId ?? "",
                                                doctorInstructions: doc.doctorInstructions ?? "",
                                                doctorPrescription: doc.doctorPrescription ?? "",
                                                status: doc.status ?? "",
                                                ...doc,
                                            }))
                                        }
                                    />
                                </div>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* Recently Dispensed Tab */}
                    <TabsContent value="recentlyDispensed">
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-5 gap-3">
                            <h2 className="text-2xl font-bold text-red-700 flex items-center gap-3">
                                <span className="inline-block w-3 h-3 rounded-full bg-red-400"></span>
                                Recently Dispensed
                            </h2>
                            <span className="text-sm bg-red-50 text-red-600 px-4 py-2 rounded-full font-semibold shadow-sm">
                                {drugsDispensed.length} Dispensed
                            </span>
                        </div>
                        <p className="text-lg text-gray-500 mb-6">
                            These are the patients you have recently dispensed. Review the history for accuracy.
                        </p>
                        <div className="w-full">
                            <Card className="p-0 w-full shadow-xl border-2 border-red-100 rounded-2xl overflow-x-auto">
                                <div className="min-w-[900px]">
                                    <DispensedHistoryTable data={drugsDispensed} />
                                </div>
                            </Card>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}

export default function PharmacyDashboard() {
    return (
        <PharmacyDashboardContent />
    );
}
