"use client";

import React, { useState } from "react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Line, Bar, Pie } from "react-chartjs-2";
import {
    ArrowUpRight,
    ArrowDownRight,
    Download,
    CalendarDays,
    TrendingUp,
    UserCheck,
    PieChart,
    Globe,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";

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

            {/* Summary Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {summary.map(({ icon, title, value, change, trend }) => (
                    <Card key={title} className="rounded-xl shadow-sm border border-gray-200">
                        <CardContent className="p-5 space-y-2">
                            <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
                                {icon}
                                {title}
                            </div>
                            <div className="text-2xl font-bold text-gray-900">{value}</div>
                            <div className={`flex items-center text-sm font-medium ${trend === "up" ? "text-green-600" : "text-red-600"}`}>
                                {trend === "up" ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                                <span className="ml-1">{change}</span>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Separator />

            {/* Line Chart */}
            <Card className="rounded-xl shadow-sm border border-gray-200">
                <CardHeader>
                    <CardTitle className="text-lg">Weekly Traffic</CardTitle>
                </CardHeader>
                <CardContent>
                    <Line
                        data={{
                            labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
                            datasets: [
                                {
                                    label: "Visitors",
                                    data: [3800, 4100, 3900, 4400, 4600, 4800, 5000],
                                    borderColor: "#3b82f6",
                                    backgroundColor: "rgba(59, 130, 246, 0.1)",
                                    fill: true,
                                    tension: 0.4,
                                },
                            ],
                        }}
                        options={{
                            responsive: true,
                            plugins: { legend: { display: false } },
                            scales: {
                                y: { ticks: { color: "#4b5563" } },
                                x: { ticks: { color: "#4b5563" } },
                            },
                        }}
                    />
                </CardContent>
            </Card>

            {/* Bar Chart */}
            <Card className="rounded-xl shadow-sm border border-gray-200">
                <CardHeader>
                    <CardTitle className="text-lg">Monthly Conversions</CardTitle>
                </CardHeader>
                <CardContent>
                    <Bar
                        data={{
                            labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
                            datasets: [
                                {
                                    label: "Conversions",
                                    data: [900, 1200, 1000, 1400, 1300, 1600],
                                    backgroundColor: "#10b981",
                                    borderRadius: 6,
                                },
                            ],
                        }}
                        options={{
                            responsive: true,
                            plugins: { legend: { display: false } },
                            scales: {
                                y: { ticks: { color: "#4b5563" } },
                                x: { ticks: { color: "#4b5563" } },
                            },
                        }}
                    />
                </CardContent>
            </Card>

            {/* Pie Chart */}
            <Card className="rounded-xl shadow-sm border border-gray-200">
                <CardHeader>
                    <CardTitle className="text-lg">User Demographics</CardTitle>
                </CardHeader>
                <CardContent>
                    <Pie
                        data={{
                            labels: ["North America", "Europe", "Asia", "Other"],
                            datasets: [
                                {
                                    label: "Users",
                                    data: [45, 30, 15, 10],
                                    backgroundColor: ["#3b82f6", "#10b981", "#f59e0b", "#e11d48"],
                                },
                            ],
                        }}
                        options={{
                            responsive: true,
                            plugins: {
                                legend: {
                                    labels: {
                                        color: "#4b5563",
                                    },
                                },
                            },
                        }}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
