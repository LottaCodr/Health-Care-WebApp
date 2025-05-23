"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Bell } from "lucide-react";
import { ToggleSwitch } from "./toggle-switch";

export default function NotificationSettings() {
    const [notifications, setNotifications] = useState({
        email: true,
        sms: false,
        push: true,
    });

    const handleToggle = (id: keyof typeof notifications, value: boolean) => {
        setNotifications((prev) => ({ ...prev, [id]: value }));
    };

    return (
        <Card className="shadow-sm border border-gray-200 rounded-2xl">
            <CardContent className="p-6 space-y-6">
                <div className="flex items-center gap-2 text-xl font-semibold text-gray-800">
                    <Bell className="w-5 h-5 text-blue-500" />
                    <span>Notifications</span>
                </div>

                <div className="space-y-4">
                    {([
                        { id: "email", label: "Email Notifications" },
                        { id: "sms", label: "SMS Notifications" },
                        { id: "push", label: "Push Notifications" },
                    ] as { id: keyof typeof notifications; label: string }[]).map(({ id, label }) => (
                        <ToggleSwitch
                            key={id}
                            id={id}
                            label={label}
                            checked={notifications[id]}
                            onChange={(value) => handleToggle(id, value)}
                        />
                    ))}
                </div>

                <div className="pt-4">
                    <Button className="bg-blue-600 hover:bg-blue-700 transition-colors duration-200 text-white">
                        Save Preferences
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
