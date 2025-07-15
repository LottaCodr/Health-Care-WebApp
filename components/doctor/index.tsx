import React from 'react';
import GreetingSection from './dashboard/greeting-section';
import StatCardsSection from './dashboard/statcard';
import IncomeExpenseSection from './dashboard/income-expense';
import AppointmentSection from './dashboard/appointment-section';
import PlaceholderSection from './dashboard/placeholder';
import AdmittedPatientsTableSection from './dashboard/currently-admitted';

const DashBoardComponent = async () => {
    return (
        <main className="max-w-7xl mx-auto px-4 sm:px-8 py-10 space-y-12">
            {/* Greeting */}
            <section className="mb-2">
                <GreetingSection />
            </section>

            {/* Stat Cards */}
            <section>
                <div className="rounded-2xl bg-gradient-to-r from-red-50 via-white to-red-100 dark:from-red-900/30 dark:to-muted/30 shadow-lg p-6 border border-red-100 dark:border-red-900/30 transition-all">
                    <StatCardsSection />
                </div>
            </section>

            {/* Appointments & Income/Expense */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="rounded-2xl bg-gradient-to-br from-white via-red-50 to-red-100 dark:from-muted/40 dark:to-red-900/20 shadow-lg p-8 border-l-4 border-red-400 flex flex-col gap-8 md:gap-10 transition-all">
                    <h2 className="text-xl font-semibold text-red-700 mb-2 flex items-center gap-2">
                        Upcoming Appointments
                        <span className="inline-block bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full ml-2">Live</span>
                    </h2>
                    <AppointmentSection />
                </div>
                <div className="rounded-2xl bg-gradient-to-br from-white via-red-50 to-red-100 dark:from-muted/40 dark:to-red-900/20 shadow-lg p-8 border-l-4 border-red-400 flex flex-col gap-8 md:gap-10 transition-all">
                    <h2 className="text-xl font-semibold text-red-700 mb-2">Income & Expense Overview</h2>
                    <IncomeExpenseSection />
                </div>
            </section>

            {/* Currently Admitted Patients */}
            <section>
                <div className="rounded-2xl bg-gradient-to-r from-red-50 via-white to-red-100 dark:from-red-900/30 dark:to-muted/30 shadow-lg p-6 border border-red-100 dark:border-red-900/30 transition-all">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold text-red-700">Currently Admitted Patients</h2>
                        <span className="text-xs text-red-500 bg-red-100 px-3 py-1 rounded-full font-medium">Live Data</span>
                    </div>
                    <AdmittedPatientsTableSection />
                </div>
            </section>

            {/* Finance Overview Placeholder */}
            <section>
                <div className="rounded-2xl border-2 border-dashed border-red-300 bg-white dark:bg-muted/40 shadow-inner p-8 flex flex-col items-center justify-center text-center transition-all">
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
