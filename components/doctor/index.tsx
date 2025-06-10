import React from 'react';
import GreetingSection from './dashboard/greeting-section';
import StatCardsSection from './dashboard/statcard';
import IncomeExpenseSection from './dashboard/income-expense';
import AppointmentSection from './dashboard/appointment-section';
import PlaceholderSection from './dashboard/placeholder';
import AdmittedPatientsTableSection from './dashboard/currently-admitted';


const DashBoardComponent = async () => {


    const isLoading = false;

    return (
        <div className="max-w-7xl mx-6 px-6 py-8 space-y-12">
            <GreetingSection />

            <StatCardsSection />

            <IncomeExpenseSection />

            <AppointmentSection />

            <AdmittedPatientsTableSection />

            <PlaceholderSection
                title="Finance Overview"
                description="Charts and finance breakdowns will be displayed here."
            />
        </div>
    );
};

export default DashBoardComponent;
