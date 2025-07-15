import React from 'react';
import GreetingSection from './dashboard/greeting-section';
import StatCardsSection from './dashboard/statcard';
import AppointmentSection from './dashboard/appointment-section';
import PlaceholderSection from './dashboard/placeholder';
import AdmittedPatientsTableSection from './dashboard/currently-admitted';
import { CalendarDays, Users, Info } from 'lucide-react';

const DashBoardComponent = () => {
    return (
        <main className="max-w-7xl mx-4 px-2 sm:px-6 py-10 space-y-14">
            {/* Greeting */}
            <section className="mb-4">
                <div className="rounded-3xl bg-gradient-to-r from-red-100/80 via-white to-red-50/90 dark:from-red-900/50 dark:to-muted/40 shadow-2xl p-8 border border-red-100 dark:border-red-900/40 transition-all flex flex-col sm:flex-row items-center gap-6">
                    <GreetingSection />
                </div>
            </section>

            {/* Stat Cards */}
            <section>
                <div className="rounded-3xl bg-gradient-to-r from-red-50 via-white to-red-100 dark:from-red-900/40 dark:to-muted/40 shadow-2xl p-8 border border-red-100 dark:border-red-900/40 transition-all">
                    <StatCardsSection />
                </div>
            </section>

            {/* Appointments */}
            <section>
                <div className="rounded-3xl bg-gradient-to-br from-white via-red-50 to-red-100 dark:from-muted/50 dark:to-red-900/30 shadow-2xl p-10 border-l-8 border-red-500/90 flex flex-col gap-8 transition-all hover:scale-[1.015] hover:shadow-2xl duration-200 relative overflow-hidden">
                    <div className="absolute right-8 top-8 opacity-10 pointer-events-none">
                        <CalendarDays className="w-28 h-28 text-red-200" />
                    </div>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-3xl font-extrabold text-red-700 flex items-center gap-3 tracking-tight drop-shadow">
                            <CalendarDays className="w-7 h-7 text-red-400" />
                            Upcoming Appointments
                        </h2>
                        <span className="inline-block bg-gradient-to-r from-red-200 via-red-100 to-white text-red-700 text-sm font-bold px-4 py-1.5 rounded-full shadow border border-red-200 animate-pulse">
                            Live
                        </span>
                    </div>
                    <div className="w-full">
                        <AppointmentSection />
                    </div>
                </div>
            </section>

            {/* Currently Admitted Patients */}
            <section>
                <div className="rounded-3xl bg-gradient-to-r from-red-50 via-white to-red-100 dark:from-red-900/40 dark:to-muted/40 shadow-2xl p-10 border border-red-100 dark:border-red-900/40 transition-all hover:shadow-2xl duration-200">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-3xl font-extrabold text-red-700 flex items-center gap-3 tracking-tight drop-shadow">
                            <Users className="w-7 h-7 text-red-400" />
                            Currently Admitted Patients
                        </h2>
                        <span className="text-sm text-red-600 bg-gradient-to-r from-red-100 via-white to-red-50 px-4 py-1.5 rounded-full font-semibold border border-red-200 shadow-sm animate-pulse">
                            Live Data
                        </span>
                    </div>
                    <div className="w-full">
                        <AdmittedPatientsTableSection />
                    </div>
                </div>
            </section>

            {/* Coming Soon Placeholder */}
            <section>
                <div className="rounded-3xl border-2 border-dashed border-red-300 bg-gradient-to-br from-white via-red-50 to-red-100 dark:bg-muted/40 shadow-inner p-14 flex flex-col items-center justify-center text-center transition-all gap-6">
                    <div className="flex items-center justify-center mb-2">
                        <Info className="w-10 h-10 text-red-400 mr-3" />
                        <span className="text-xl font-semibold text-red-700">More Features Coming Soon</span>
                    </div>
                    <PlaceholderSection
                        title="Stay Tuned!"
                        description="New analytics and features will be available here soon. Thank you for using our dashboard."
                    />
                </div>
            </section>
        </main>
    );
};

export default DashBoardComponent;
