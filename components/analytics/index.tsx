"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";

// Chart.js registration
import {
    Chart as ChartJS,
    LineElement,
    BarElement,
    ArcElement,
    CategoryScale,
    LinearScale,
    PointElement,
    Tooltip,
    Legend,
} from "chart.js";

ChartJS.register(
    LineElement,
    BarElement,
    ArcElement,
    CategoryScale,
    LinearScale,
    PointElement,
    Tooltip,
    Legend
);


import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Download,
    CalendarDays,
    TrendingUp,
    UserCheck,
    PieChart,
} from "lucide-react";
import ChartCard from "./components/chart-card";
import LineChart from "./components/line-chart";
import BarChart from "./components/bar-chart";
import SummaryCard from "./components/summary-card";

const summary = [
    {
        icon: <TrendingUp className="text-green-600 w-5 h-5" />,
        title: "Visitors",
        value: "24,980",
        change: "+12.5%",
        trend: "up",
    },
    {
        icon: <UserCheck className="text-blue-600 w-5 h-5" />,
        title: "New Signups",
        value: "4,322",
        change: "+8.2%",
        trend: "up",
    },
    {
        icon: <PieChart className="text-yellow-600 w-5 h-5" />,
        title: "Conversions",
        value: "1,283",
        change: "-3.1%",
        trend: "down",
    },
];

const dateOptions = ["Last 7 Days", "Last 30 Days", "This Month", "Custom"];

export default function AnalyticsComponent() {
    const [selectedDate, setSelectedDate] = useState("Last 7 Days");
    const [compare, setCompare] = useState(false);

    return (
        <div className="max-w-7xl mx-6 px-6 py-10 space-y-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
                    <p className="text-sm text-gray-600">
                        Track key performance metrics and user behavior.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="gap-2 text-sm">
                                <CalendarDays className="w-4 h-4" />
                                {selectedDate}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            {dateOptions.map((option) => (
                                <DropdownMenuItem
                                    key={option}
                                    onSelect={() => setSelectedDate(option)}
                                >
                                    {option}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <Button
                        variant="secondary"
                        className="gap-2 text-sm"
                        onClick={() => setCompare(!compare)}
                    >
                        {compare ? "Comparing..." : "Compare"}
                    </Button>

                    <Button variant="outline" className="gap-2 text-sm">
                        <Download className="w-4 h-4" />
                        Export
                    </Button>
                </div>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {summary.map((props) => (
                    <SummaryCard
                        key={props.title}
                        icon={props.icon}
                        title={props.title}
                        value={props.value}
                        change={props.change}
                        trend={props.trend as "up" | "down"}
                    />
                ))}
            </div>

            {/* Line Chart */}
            <ChartCard title="Weekly Traffic">
                <LineChart />
            </ChartCard>

            {/* Bar Chart */}
            <ChartCard title="Monthly Conversions">
                <BarChart />
            </ChartCard>

            {/* Pie Chart */}
            <ChartCard title="User Demographics">
                <PieChart />
            </ChartCard>



        </div>
    );
}
