
import React from "react";
import DashBoardComponent from "@/components/doctor";
import { Separator } from "@/components/ui/separator";
import { MdDashboard } from "react-icons/md";

const DashboardPage = async () => {
  // Optionally, you could add a greeting based on time of day
  function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-100 flex flex-col items-center py-10">
      <header className="w-full max-w-4xl flex items-center justify-between mb-8 px-6">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center justify-center rounded-full bg-red-100 p-4 shadow-lg border-2 border-red-200">
            <MdDashboard className="text-3xl text-red-600 drop-shadow" />
          </span>
          <div>
            <h1 className="text-3xl font-bold text-red-700 tracking-tight drop-shadow-sm">
              Doctor Dashboard
            </h1>
            <p className="text-sm text-red-500 font-medium mt-1">
              {getGreeting()}, <span className="font-semibold">Doctor</span>!
            </p>
          </div>
        </div>
        <span className="inline-block bg-red-100 text-red-700 px-4 py-2 rounded-lg font-medium shadow-sm border border-red-200">
          Welcome, Doctor
        </span>
      </header>
      <section className="w-full max-w-4xl">
        <Separator className="bg-red-200 mb-6" />
        <div className="rounded-2xl bg-white/95 shadow-2xl border-2 border-red-100 p-6 sm:p-10 min-h-[60vh] transition-all">
          <DashBoardComponent />
        </div>
      </section>
    </main>
  );
};

export default DashboardPage;