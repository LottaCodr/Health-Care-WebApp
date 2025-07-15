import React from 'react';
import GreetingSection from './dashboard/greeting-section';
import StatCardsSection from './dashboard/statcard';
import IncomeExpenseSection from './dashboard/income-expense';
import AppointmentSection from './dashboard/appointment-section';
import PlaceholderSection from './dashboard/placeholder';
import AdmittedPatientsTableSection from './dashboard/currently-admitted';

const DashBoardComponent = async () => {
    return (
        <main className="max-w-7xl mx-auto px-4 sm:px-8 py-10 space-y-14">
            {/* Greeting */}
            <section className="mb-2">
                <GreetingSection />
            </section>

            {/* Stat Cards */}
            <section>
                <div className="rounded-2xl bg-red-50 dark:bg-red-900/20 shadow-md p-6">
                    <StatCardsSection />
                </div>
            </section>

            {/* Income & Expense + Appointments */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="rounded-2xl bg-white dark:bg-muted/40 shadow p-6 border-l-4 border-red-400">
                    <IncomeExpenseSection />
                </div>
                <div className="rounded-2xl bg-white dark:bg-muted/40 shadow p-6 border-l-4 border-red-400">
                    <AppointmentSection />
                </div>
            </section>

            {/* Currently Admitted Patients */}
            <section>
                <div className="rounded-2xl bg-red-50 dark:bg-red-900/20 shadow-md p-6">
                    <AdmittedPatientsTableSection />
                </div>
            </section>

            {/* Finance Overview Placeholder */}
            <section>
                <div className="rounded-2xl border-2 border-dashed border-red-300 bg-white dark:bg-muted/40 shadow-inner p-8 flex flex-col items-center justify-center text-center">
                    <PlaceholderSection
                        title="Finance Overview"
                        description="Charts and finance breakdowns will be displayed here."
                    />

                </div>
            </section>
        </main>
    );
};

export default DashBoardComponent;
