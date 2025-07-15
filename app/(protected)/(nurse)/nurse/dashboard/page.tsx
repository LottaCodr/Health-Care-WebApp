
import NurseDashboardComponent from '@/components/nurse/component'
import React from 'react'
import { account } from '@/lib/appwrite.config'

async function getNurseName() {
    try {
        const user = await account.get();
        // Try to get a display name, fallback to email prefix or "Nurse"
        if (user.name && user.name.trim().length > 0) {
            return user.name.split(' ')[0]; // First name
        }
        if (user.email) {
            return user.email.split('@')[0];
        }
        return "Nurse";
    } catch {
        return "Nurse";
    }
}

const DashboardPage = async () => {
    const nurseName = await getNurseName();

    // Optionally, you could add a greeting based on time of day
    function getGreeting() {
        const hour = new Date().getHours();
        if (hour < 12) return "Good morning";
        if (hour < 18) return "Good afternoon";
        return "Good evening";
    }

    return (
        <main className="min-h-screen bg-red-50 flex flex-col items-center py-10">
            <header className="w-full max-w-4xl flex items-center justify-between mb-8 px-6">
                <div className="flex items-center gap-3">
                    <img
                        src="/nurse-avatar.png"
                        alt="Nurse Avatar"
                        className="w-12 h-12 rounded-full border-2 border-red-200 shadow"
                        onError={e => (e.currentTarget.style.display = 'none')}
                    />
                    <div>
                        <h1 className="text-3xl font-bold text-red-700 tracking-tight">
                            Nurse Dashboard
                        </h1>
                        <p className="text-sm text-red-500 font-medium mt-1">
                            {getGreeting()}, <span className="font-semibold">{nurseName}</span>!
                        </p>
                    </div>
                </div>
                <span className="inline-block bg-red-100 text-red-700 px-4 py-2 rounded-lg font-medium shadow-sm">
                    Welcome, {nurseName}
                </span>
            </header>
            <section className="w-full max-w-4xl bg-white rounded-2xl shadow-lg p-6">
                <NurseDashboardComponent />
            </section>
        </main>
    );
}

export default DashboardPage