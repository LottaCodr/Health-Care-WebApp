import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { FiUsers, FiClipboard, FiThermometer, FiClock } from "react-icons/fi";
import { BsPeople, BsBarChart } from "react-icons/bs";
import { MdLocalHospital } from "react-icons/md";
import { Button } from "@/components/ui/button";

const mockStats = [
    {
        title: "Checked-In Patients",
        count: 25,
        icon: <FiUsers className="text-blue-600 w-5 h-5" />,
    },
    {
        title: "Pending Lab Results",
        count: 7,
        icon: <FiClipboard className="text-yellow-600 w-5 h-5" />,
    },
    {
        title: "Vitals Captured",
        count: 42,
        icon: <FiThermometer className="text-green-600 w-5 h-5" />,
    },
    {
        title: "Queue Length",
        count: 9,
        icon: <FiClock className="text-red-600 w-5 h-5" />,
    },
];

export default function LabTechDashboardComponent() {
    return (
        <section className="w-full px-4 md:px-8 py-6 space-y-6">
            <header className="mb-6">
                <h1 className="text-2xl md:text-3xl font-bold text-blue-900">
                    Welcome, Lab Technician
                </h1>
                <p className="text-gray-600">Here’s what’s happening today</p>
            </header>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {mockStats.map((stat, index) => (
                    <Card key={index} className="shadow-sm border border-gray-200">
                        <CardContent className="flex items-center justify-between p-4">
                            <div className="space-y-1">
                                <p className="text-sm text-gray-500">{stat.title}</p>
                                <p className="text-xl font-semibold text-gray-800">{stat.count}</p>
                            </div>
                            <div className="bg-blue-50 rounded-full p-2">
                                {stat.icon}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="shadow-sm border border-gray-200">
                    <CardContent className="p-4 space-y-2">
                        <h2 className="text-lg font-semibold text-blue-800 mb-2">Quick Actions</h2>
                        <div className="flex flex-wrap gap-2">
                            <Button variant="outline" size="sm">
                                New Lab Entry
                            </Button>
                            <Button variant="outline" size="sm">
                                View Queue
                            </Button>
                            <Button variant="outline" size="sm">
                                Upload Result
                            </Button>
                            <Button variant="outline" size="sm">
                                Patient Records
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Optional Lab Insights */}
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
        </section>
    );
}
