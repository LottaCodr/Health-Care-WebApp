"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
    FiUsers,
    FiClipboard,
    FiThermometer,
    FiClock
} from "react-icons/fi";
import {
    MdAssignment,
    MdPeople,
    MdScience,
    MdWarning
} from "react-icons/md";
import { BsBarChart } from "react-icons/bs";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer
} from "recharts";
import { useRole } from "@/hooks/use-role";

const summaryStats = [
    {
        title: "Checked-In Patients",
        count: 25,
        icon: <FiUsers className="text-blue-600 w-5 h-5" />
    },
    {
        title: "Pending Lab Results",
        count: 7,
        icon: <FiClipboard className="text-yellow-600 w-5 h-5" />
    },
    {
        title: "Vitals Captured",
        count: 42,
        icon: <FiThermometer className="text-green-600 w-5 h-5" />
    },
    {
        title: "Queue Length",
        count: 9,
        icon: <FiClock className="text-red-600 w-5 h-5" />
    }
];

const chartData = [
    { name: "Mon", tests: 20 },
    { name: "Tue", tests: 40 },
    { name: "Wed", tests: 30 },
    { name: "Thu", tests: 50 },
    { name: "Fri", tests: 45 }
];

const notifications = [
    { message: "New urgent test request from Dr. Smith", time: "5 mins ago" },
    { message: "Stock of reagent X is low", time: "30 mins ago" }
];

export default function LabTechDashboardComponent() {
    const role = useRole();

    if (role !== "lab-tech") {
        return (
            <div className="p-6 text-red-600">
                Access Denied: You do not have permission to view this dashboard.
            </div>
        );
    }

    return (
        <section className="w-full px-4 md:px-8 py-6 space-y-6">
            <header className="mb-4">
                <h1 className="text-2xl md:text-3xl font-bold text-blue-900">
                    Welcome, Lab Technician
                </h1>
                <p className="text-gray-600">Here's a snapshot of today’s activities</p>
            </header>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {summaryStats.map((stat, idx) => (
                    <Card key={idx} className="shadow-sm border border-gray-200">
                        <CardContent className="flex items-center justify-between p-4">
                            <div>
                                <p className="text-sm text-gray-500">{stat.title}</p>
                                <p className="text-xl font-semibold text-gray-800">
                                    {stat.count}
                                </p>
                            </div>
                            <div className="bg-blue-50 rounded-full p-2">{stat.icon}</div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="flex items-center gap-4 p-4">
                        <MdAssignment className="text-blue-600 w-8 h-8" />
                        <div>
                            <p className="text-gray-600">Pending Lab Tests</p>
                            <p className="text-xl font-bold">12</p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="flex items-center gap-4 p-4">
                        <MdPeople className="text-green-600 w-8 h-8" />
                        <div>
                            <p className="text-gray-600">Patients in Queue</p>
                            <p className="text-xl font-bold">5</p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="flex items-center gap-4 p-4">
                        <MdScience className="text-purple-600 w-8 h-8" />
                        <div>
                            <p className="text-gray-600">Tests Completed Today</p>
                            <p className="text-xl font-bold">27</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Charts + Notifications */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                    <CardContent className="p-4">
                        <h2 className="text-lg font-semibold text-blue-800 mb-2">
                            Weekly Test Volume
                        </h2>
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={chartData}>
                                <XAxis dataKey="name" stroke="#8884d8" />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="tests" fill="#4F46E5" barSize={30} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <h2 className="text-lg font-semibold text-blue-800 mb-2">
                            Notifications
                        </h2>
                        <ul className="space-y-2">
                            {notifications.map((note, idx) => (
                                <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                                    <MdWarning className="text-yellow-500 mt-1 w-5 h-5" />
                                    <div>
                                        <p>{note.message}</p>
                                        <span className="text-xs text-gray-400">{note.time}</span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            </div>

            {/* Quick Actions + Placeholder */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="shadow-sm border border-gray-200">
                    <CardContent className="p-4 space-y-2">
                        <h2 className="text-lg font-semibold text-blue-800 mb-2">Quick Actions</h2>
                        <div className="flex flex-wrap gap-2">
                            <Link href="/lab-tech/new-entry" passHref>
                                <Button variant="outline" size="sm">New Lab Entry</Button>
                            </Link>

                            <Link href="/lab-tech/queue" passHref>
                                <Button variant="outline" size="sm">View Queue</Button>
                            </Link>

                            <Link href="/lab-tech/upload-result" passHref>
                                <Button variant="outline" size="sm">Upload Result</Button>
                            </Link>

                            <Link href="/lab-tech/patient-records" passHref>
                                <Button variant="outline" size="sm">Patient Records</Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-sm border border-gray-200">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <BsBarChart className="w-6 h-6 text-blue-500" />
                            <h2 className="text-lg font-semibold text-blue-800">
                                Lab Activity Insights (Coming Soon)
                            </h2>
                        </div>
                        <p className="text-sm text-gray-500 mt-2">
                            Analytics on turnaround time, most frequent tests, etc.
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="pt-4">
                <Button variant="default">Go to Lab Workflow</Button>
            </div>
        </section>
    );
}
