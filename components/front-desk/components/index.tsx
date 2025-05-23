import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MdCalendarToday, MdPeople, MdPersonAddAlt1, MdSupportAgent } from "react-icons/md";
import { FiArrowRight } from "react-icons/fi";
import { cn } from "@/lib/utils";

export default function FrontDeskDashboardComponent() {
    return (
        <div className="p-6 space-y-6">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-blue-900">Welcome, Front Desk Officer</h1>
                    <p className="text-sm text-gray-600">Here&#39;s a snapshot of today&#39;s operations.</p>
                </div>
            </header>

            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <DashboardCard title="Today's Appointments" value="12" icon={MdCalendarToday} />
                <DashboardCard title="New Patients" value="4" icon={MdPersonAddAlt1} />
                <DashboardCard title="Total Visits" value="38" icon={MdPeople} />
                <DashboardCard title="Support Tickets" value="2" icon={MdSupportAgent} />
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                    <CardContent className="p-4">
                        <h2 className="text-lg font-semibold text-blue-800 mb-4">Upcoming Appointments</h2>
                        <ul className="space-y-3">
                            <li className="flex items-center justify-between border rounded-lg p-3 hover:shadow-sm">
                                <span className="text-sm font-medium text-gray-700">John Doe - 10:00 AM</span>
                                <Button variant="outline" size="sm">Check In</Button>
                            </li>
                            <li className="flex items-center justify-between border rounded-lg p-3 hover:shadow-sm">
                                <span className="text-sm font-medium text-gray-700">Jane Smith - 11:30 AM</span>
                                <Button variant="outline" size="sm">Check In</Button>
                            </li>
                        </ul>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <h2 className="text-lg font-semibold text-blue-800 mb-4">Quick Actions</h2>
                        <div className="flex flex-col gap-3">
                            <Button className="justify-between" variant="secondary">
                                Register New Patient <FiArrowRight className="ml-2" />
                            </Button>
                            <Button className="justify-between" variant="secondary">
                                View All Appointments <FiArrowRight className="ml-2" />
                            </Button>
                            <Button className="justify-between" variant="secondary">
                                Open Ticket <FiArrowRight className="ml-2" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </section>
        </div>
    );
}

function DashboardCard({ title, value, icon: Icon }: { title: string; value: string; icon: React.ElementType }) {
    return (
        <Card className="shadow-md border rounded-xl">
            <CardContent className="flex items-center gap-4 p-4">
                <div className={cn("p-3 rounded-lg bg-blue-100 text-blue-600")}> <Icon className="w-6 h-6" /></div>
                <div>
                    <div className="text-sm text-gray-500">{title}</div>
                    <div className="text-xl font-bold text-blue-900">{value}</div>
                </div>
            </CardContent>
        </Card>
    );
}
