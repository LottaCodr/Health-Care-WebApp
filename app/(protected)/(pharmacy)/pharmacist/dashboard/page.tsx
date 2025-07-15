
import React from "react";
import PharmacyDashboard from "@/components/pharmacy";

const PharmacyDashboardPage = async () => {
    return (
        <main className="min-h-screen bg-red-50 flex flex-col items-center py-10 animate-fade-in">
            <header className="w-full max-w-5xl flex items-center justify-between mb-8 px-6">
                <div className="flex items-center gap-3">
                    <span className="bg-red-100 rounded-xl p-2 flex items-center justify-center shadow">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="w-8 h-8 text-red-600"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            aria-hidden="true"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M17 8h2a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2v-8a2 2 0 012-2h2M12 12v6m0 0l3-3m-3 3l-3-3m6-6V6a2 2 0 00-2-2h-2a2 2 0 00-2 2v2"
                            />
                        </svg>
                    </span>
                    <h1 className="text-3xl font-bold text-red-700 tracking-tight drop-shadow">
                        Pharmacy Dashboard
                    </h1>
                </div>
                <span className="inline-block bg-red-100 text-red-700 px-4 py-2 rounded-lg font-medium shadow-sm">
                    Welcome, Pharmacist
                </span>
            </header>
            <section className="w-full max-w-5xl bg-white rounded-2xl shadow-lg p-6 border border-red-100">
                <PharmacyDashboard />
            </section>
        </main>
    );
};

export default PharmacyDashboardPage;