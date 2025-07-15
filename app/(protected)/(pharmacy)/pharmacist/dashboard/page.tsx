
import React from "react";
import PharmacyDashboard from "@/components/pharmacy";

const PharmacyDashboardPage = async () => {
    return (
        <main className="min-h-screen bg-red-50 flex flex-col items-center py-10 animate-fade-in">
           
            <section className="w-full max-w-[1800px] bg-white rounded-2xl shadow-lg p-10 border border-red-100">
                <PharmacyDashboard />
            </section>
        </main>
    );
};

export default PharmacyDashboardPage;