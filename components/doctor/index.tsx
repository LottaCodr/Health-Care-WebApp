import React from 'react';
import GreetingSection from './dashboard/greeting-section';
import StatCardsSection from './dashboard/statcard';
import IncomeExpenseSection from './dashboard/income-expense';
import AppointmentSection from './dashboard/appointment-section';
import PlaceholderSection from './dashboard/placeholder';
import AdmittedPatientsTableSection from './dashboard/currently-admitted';

const DashBoardComponent = async () => {
    return (
        <main className="max-w-7xl mx-auto px-2 sm:px-6 py-10 space-y-14">
            {/* Greeting */}
            <section className="mb-4">
                <div className="rounded-2xl bg-gradient-to-r from-red-100/60 via-white to-red-50/80 dark:from-red-900/40 dark:to-muted/30 shadow-xl p-6 border border-red-100 dark:border-red-900/30 transition-all">
                    <GreetingSection />
                </div>
            </section>

            {/* Stat Cards */}
            <section>
                <div className="rounded-2xl bg-gradient-to-r from-red-50 via-white to-red-100 dark:from-red-900/30 dark:to-muted/30 shadow-xl p-6 border border-red-100 dark:border-red-900/30 transition-all">
                    <StatCardsSection />
                </div>
            </section>

            {/* Appointments & Income/Expense */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="rounded-2xl bg-gradient-to-br from-white via-red-50 to-red-100 dark:from-muted/40 dark:to-red-900/20 shadow-xl p-8 border-l-4 border-red-500/80 flex flex-col gap-8 md:gap-10 transition-all hover:scale-[1.01] hover:shadow-2xl duration-200">
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="text-xl font-bold text-red-700 flex items-center gap-2">
                            Upcoming Appointments
                        </h2>
                        <span className="inline-block bg-gradient-to-r from-red-200 via-red-100 to-white text-red-700 text-xs font-bold px-3 py-1 rounded-full shadow border border-red-200 animate-pulse">
                            Live
                        </span>
                    </div>
                    <AppointmentSection />
                </div>
                <div className="rounded-2xl bg-gradient-to-br from-white via-red-50 to-red-100 dark:from-muted/40 dark:to-red-900/20 shadow-xl p-8 border-l-4 border-red-500/80 flex flex-col gap-8 md:gap-10 transition-all hover:scale-[1.01] hover:shadow-2xl duration-200">
                    <h2 className="text-xl font-bold text-red-700 mb-2">Income & Expense Overview</h2>
                    <IncomeExpenseSection />
                </div>
            </section>

            {/* Currently Admitted Patients */}
            <section>
                <div className="rounded-2xl bg-gradient-to-r from-red-50 via-white to-red-100 dark:from-red-900/30 dark:to-muted/30 shadow-xl p-6 border border-red-100 dark:border-red-900/30 transition-all hover:shadow-2xl duration-200">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-red-700 flex items-center gap-2">
                            Currently Admitted Patients
                        </h2>
                        <span className="text-xs text-red-600 bg-gradient-to-r from-red-100 via-white to-red-50 px-3 py-1 rounded-full font-semibold border border-red-200 shadow-sm animate-pulse">
                            Live Data
                        </span>
                    </div>
                    <AdmittedPatientsTableSection />
                </div>
            </section>

            {/* Finance Overview Placeholder */}
            <section>
                <div className="rounded-2xl border-2 border-dashed border-red-300 bg-gradient-to-br from-white via-red-50 to-red-100 dark:bg-muted/40 shadow-inner p-10 flex flex-col items-center justify-center text-center transition-all">
                    <PlaceholderSection
                        title="Finance Overview"
                        description="Charts and finance breakdowns will be displayed here soon. Stay tuned for more insights!"
                    />
                </div>
            </section>
        </main>
    );
};

export default DashBoardComponent;
