"use client";

import React from "react";
import AccountSettings from "./components/account-settings";
import SecuritySettings from "./components/secuirty-settings";
import NotificationSettings from "./components/notification-settings";
import DangerZone from "./components/danger-zone";

export default function SettingsComponent() {
    return (
        <div className="max-w-5xl mx-6 px-4 sm:px-6 lg:px-8 py-10 space-y-10">
            <section className="space-y-1">
                <h1 className="text-4xl font-bold tracking-tight text-gray-900">
                    Settings
                </h1>
                <p className="text-base text-gray-600">
                    Manage your account preferences and privacy settings.
                </p>
            </section>

            <AccountSettings />
            <SecuritySettings />
            <NotificationSettings />
            <DangerZone />
        </div>
    );
}
