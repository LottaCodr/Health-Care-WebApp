"use client";

import React from 'react'
import DashBoardComponent from '@/components/lab-tech/DashBoardComponent'

const DashboardPage = () => {
    return (
        width = { 48}
                            height = { 48}
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
                        </svg >
                    </div >
                    <span className="text-red-700 font-semibold text-lg animate-pulse tracking-wide">
                        Loading your Lab Dashboard...
                    </span>
                    <span className="text-gray-500 text-sm">
                        Please wait while we prepare your personalized experience.
                    </span>
                </div >
            }
        >
    <LabTechDashboardComponent />
        </Suspense >
    );
};

export default DashboardPage;