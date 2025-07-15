
import NurseDashboardComponent from '@/components/nurse/component'
import React from 'react'

const DashboardPage = async () => {
    return (
        <main className="min-h-screen bg-red-50 flex flex-col items-center py-10">
            <header className="w-full max-w-4xl flex items-center justify-between mb-8 px-6">
                <h1 className="text-3xl font-bold text-red-700 tracking-tight">
                    Nurse Dashboard
                </h1>
                <span className="inline-block bg-red-100 text-red-700 px-4 py-2 rounded-lg font-medium shadow-sm">
                    Welcome, Nurse
                </span>
            </header>
            <section className="w-full max-w-4xl bg-white rounded-2xl shadow-lg p-6">
                <NurseDashboardComponent />
            </section>
        </main>
    );
}

export default DashboardPage