import { getRecentAppointmentList } from '@/lib/actions/appointment.action';
import React from 'react';
import StatCardSkeleton from '../statcard/skeleton';
import StatCard from '../StatCard';
import { MdLocalHospital, MdPeople, MdExitToApp, MdEventBusy, MdAttachMoney, MdListAlt } from 'react-icons/md';
import { DataTable } from './table/DataTable';
import { columns } from './table/columns';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle } from 'lucide-react';

const DashBoardComponent = async () => {
    let appointments = null;
    let error = null;

    try {
        appointments = await getRecentAppointmentList();
    } catch (err) {
        console.error("Error fetching appointments:", err);
        error = err;
    }

    const isLoading = !appointments && !error;
    const isEmpty = appointments && appointments.documents?.length === 0;

    return (
        <div className="max-w-7xl mx-6 px-6 py-8 space-y-12">
            {/* Greeting */}
            <section>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                    Welcome back, Admin 👋
                </h1>
                <p className="text-muted-foreground text-sm">
                    Overview of hospital activity and appointments.
                </p>
            </section>

            {/* Stat Cards */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLoading ? (
                    <>
                        <StatCardSkeleton type="admitted" />
                        <StatCardSkeleton type="staff" />
                        <StatCardSkeleton type="discharged" />
                    </>
                ) : (
                    <>
                        <StatCard
                            type="admitted"
                            icon={<MdLocalHospital className="text-xl text-foreground" />}
                            label="Admitted Patients"
                            count={3500}
                            comparison="↑ Compared to 2,300 last quarter"
                        />
                        <StatCard
                            type="staff"
                            icon={<MdPeople className="text-xl text-foreground" />}
                            label="Staff on Duty"
                            count={120}
                        />
                        <StatCard
                            type="discharged"
                            icon={<MdExitToApp className="text-xl text-foreground" />}
                            label="Discharged Patients"
                            count={3100}
                            comparison="↑ Compared to 2,700 last quarter"
                        />
                    </>
                )}
            </section>

            {/* Income & Finance Summary */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <StatCard
                    type="income"
                    icon={<MdAttachMoney className="text-xl text-foreground" />}
                    label="Monthly Income"
                    count={580000}
                    comparison="↑ 12% from last month"
                />
                <StatCard
                    type="expenses"
                    icon={<MdAttachMoney className="text-xl text-foreground" />}
                    label="Monthly Expenses"
                    count={430000}
                    comparison="↓ 5% from last month"
                />
            </section>

            {/* Appointment Table */}
            <section className="rounded-md border bg-background shadow-sm p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-medium">Recent Appointments</h2>
                    <span className="text-xs text-muted-foreground">
                        Last updated: {new Date().toLocaleString()}
                    </span>
                </div>

                {error && (
                    <div className="flex items-center space-x-2 text-sm text-red-600">
                        <AlertTriangle className="w-4 h-4" />
                        <span>Failed to load appointments. Please try again later.</span>
                    </div>
                )}

                {isLoading && (
                    <div className="space-y-4">
                        <Skeleton className="h-10 w-full rounded-md" />
                        <Skeleton className="h-10 w-full rounded-md" />
                        <Skeleton className="h-10 w-full rounded-md" />
                    </div>
                )}

                {!isLoading && isEmpty && (
                    <div className="flex flex-col items-center justify-center text-center py-8">
                        <MdEventBusy className="text-muted-foreground text-4xl mb-2" />
                        <p className="text-muted-foreground text-sm">
                            No recent appointments found.
                        </p>
                    </div>
                )}

                {!isLoading && appointments && appointments.documents?.length > 0 && (
                    <DataTable columns={columns} data={appointments.documents} />
                )}
            </section>

            {/* Patient List Placeholder */}
            <section className="rounded-md border bg-background shadow-sm p-6">
                <h2 className="text-lg font-medium mb-4">Current Patient List</h2>
                <div className="text-muted-foreground text-sm">Coming soon: a list of currently admitted patients.</div>
            </section>

            {/* Finance Overview Placeholder */}
            <section className="rounded-md border bg-background shadow-sm p-6">
                <h2 className="text-lg font-medium mb-4">Finance Overview</h2>
                <div className="text-muted-foreground text-sm">Charts and finance breakdowns will be displayed here.</div>
            </section>
        </div>
    );
};

export default DashBoardComponent;
