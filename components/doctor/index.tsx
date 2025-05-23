import React from 'react';
import GreetingSection from './dashboard/greeting-section';
import StatCardsSection from './dashboard/statcard';
import IncomeExpenseSection from './dashboard/income-expense';
import AppointmentSection from './dashboard/appointment-section';
import PlaceholderSection from './dashboard/placeholder';


const DashBoardComponent = async () => {
    // Note: appointments loading moved inside AppointmentSection
    // You can add any other logic here if needed.

    // We pass isLoading flag only to StatCardsSection because those cards are static here.
    // You can adjust if dynamic.

    const isLoading = false; // Or use your loading state if needed

    return (
        <div className="max-w-7xl mx-6 px-6 py-8 space-y-12">
            <GreetingSection />

            <StatCardsSection isLoading={isLoading} />

            <IncomeExpenseSection />

            <AppointmentSection />

            <PlaceholderSection
                title="Current Patient List"
                description="Coming soon: a list of currently admitted patients."
            />

            <PlaceholderSection
                title="Finance Overview"
                description="Charts and finance breakdowns will be displayed here."
            />
        </div>
    );
};

export default DashBoardComponent;
