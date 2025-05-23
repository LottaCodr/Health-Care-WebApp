"use client"

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FaUserPlus, FaUserClock, FaHeartbeat, FaPills, FaNotesMedical } from "react-icons/fa";
import { BiCalendarEvent } from "react-icons/bi";
import { BsPeople } from "react-icons/bs";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const todayStats = [
    { title: "New Patients", count: 8, icon: <FaUserPlus className="text-blue-600" /> },
    { title: "In Queue", count: 12, icon: <FaUserClock className="text-yellow-600" /> },
    { title: "Vitals Taken", count: 25, icon: <FaHeartbeat className="text-red-500" /> },
    { title: "Meds Dispensed", count: 17, icon: <FaPills className="text-green-600" /> },
];

const sampleChartData = [
    { name: "Mon", vitals: 15, meds: 10 },
    { name: "Tue", vitals: 20, meds: 12 },
    { name: "Wed", vitals: 30, meds: 18 },
    { name: "Thu", vitals: 25, meds: 22 },
    { name: "Fri", vitals: 40, meds: 30 },
];

export default function NurseDashboardComponent() {
    return (
        <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {todayStats.map((stat) => (
                    <Card key={stat.title} className="shadow-sm border">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <h4 className="text-sm text-gray-500">{stat.title}</h4>
                                <p className="text-2xl font-bold text-gray-800">{stat.count}</p>
                            </div>
                            <div className="text-3xl">{stat.icon}</div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm border">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Weekly Activity</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={sampleChartData}>
                        <XAxis dataKey="name" stroke="#8884d8" />
                        <YAxis stroke="#8884d8" />
                        <Tooltip />
                        <Bar dataKey="vitals" fill="#34d399" name="Vitals Taken" />
                        <Bar dataKey="meds" fill="#60a5fa" name="Meds Dispensed" />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <Tabs defaultValue="appointments" className="mt-6">
                <TabsList className="w-full justify-start gap-4">
                    <TabsTrigger value="appointments"><BiCalendarEvent className="inline mr-1" /> Appointments</TabsTrigger>
                    <TabsTrigger value="visitors"><BsPeople className="inline mr-1" /> Visitors</TabsTrigger>
                    <TabsTrigger value="notes"><FaNotesMedical className="inline mr-1" /> Nursing Notes</TabsTrigger>
                </TabsList>
                <TabsContent value="appointments">
                    <div className="p-4 text-sm text-gray-600 border rounded-lg mt-2 bg-gray-50">
                        No upcoming appointments today.
                    </div>
                </TabsContent>
                <TabsContent value="visitors">
                    <div className="p-4 text-sm text-gray-600 border rounded-lg mt-2 bg-gray-50">
                        No visitors currently waiting.
                    </div>
                </TabsContent>
                <TabsContent value="notes">
                    <div className="p-4 text-sm text-gray-600 border rounded-lg mt-2 bg-gray-50">
                        All nursing notes for the day are up to date.
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
