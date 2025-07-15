
import React from "react";
import DashBoardComponent from "@/components/doctor";
import { Separator } from "@/components/ui/separator";
import { MdDashboard } from "react-icons/md";

const DashboardPage = async () => {
  return (
    <section className="space-y-8">
      {/* Header */}
      <header className="flex items-center justify-between gap-4 mb-2">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center justify-center rounded-full bg-red-100 p-3 shadow">
            <MdDashboard className="text-2xl text-red-500" />
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-red-700 tracking-tight">
            Doctor Dashboard
          </h1>
        </div>
        {/* You can add a quick action button here if needed */}
      </header>
      <Separator className="bg-red-200" />

      {/* Main Dashboard Content */}
      <div className="rounded-2xl bg-white/90 shadow-lg border border-red-100 p-4 sm:p-8 min-h-[60vh]">
        <DashBoardComponent />
      </div>
    </section>
  );
};

export default DashboardPage;