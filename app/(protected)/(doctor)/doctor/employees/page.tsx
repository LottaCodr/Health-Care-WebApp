import EmployeesComponent from '@/components/doctor/employees'
import React from 'react'

const Employees = async () => {
    return (
        <main className="min-h-screen bg-gradient-to-br from-red-50 to-white dark:from-zinc-900 dark:to-zinc-950 py-10 px-2">
            <section className="max-w-7xl mx-auto">
                <header className="mb-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <h1 className="text-3xl font-extrabold text-red-700 dark:text-red-400 flex items-center gap-2">
                        <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m9-5a4 4 0 11-8 0 4 4 0 018 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Staff Management
                    </h1>
                    <span className="text-sm text-muted-foreground">
                        Manage your clinic&apos;s staff, roles, and permissions.
                    </span>
                </header>
                <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-lg border border-red-200 dark:border-red-900 transition-all duration-300 p-4 sm:p-8">
                    <EmployeesComponent />
                </div>
            </section>
        </main>
    )
}

export default Employees