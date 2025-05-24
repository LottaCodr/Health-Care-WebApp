import React from "react";

import PharmacistTabs from "./tabs";

export default function PharmacistWorkflowComponent() {
    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-blue-900">Pharmacy Workflow</h1>
                <p className="text-sm text-gray-600">Manage medications, inventory, and pharmacist tasks.</p>
            </div>

            <PharmacistTabs />

        </div>
    );
}
