
"use client";

import React, { Suspense } from "react";
import LabTechDashboardComponent from "@/components/lab-tech/components";

// Enhanced loading UI for better visual appeal
const DashboardPage = () => {
    return (
        <Suspense
            fallback={
                <div className="flex flex-col items-center justify-center h-[60vh] gap-4 bg-gradient-to-br from-red-50 via-white to-white rounded-lg shadow-inner">
                    <div className="flex items-center justify-center w-20 h-20 rounded-full bg-red-100 shadow animate-pulse">
                        <svg
                            className="animate-spin text-red-400"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 48 48"
                            width={48}
                            height={48}
                        >
                            <circle
                                className="opacity-25"
                                cx="24"
                                cy="24"
                                r="20"
                                stroke="currentColor"
                                strokeWidth="6"
                            ></circle>
                            <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M8 24a16 16 0 0116-16v8a8 8 0 00-8 8H8z"
                            ></path>
                        </svg>
                    </div>
                    <span className="text-red-700 font-semibold text-lg animate-pulse tracking-wide">
                        Loading your Lab Dashboard...
                    </span>
                    <span className="text-gray-500 text-sm">
                        Please wait while we prepare your personalized experience.
                    </span>
                </div>
            }
        >
            <LabTechDashboardComponent />
        </Suspense>
    );
};

export default DashboardPage;