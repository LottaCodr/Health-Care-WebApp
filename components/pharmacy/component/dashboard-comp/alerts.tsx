import React from 'react';
import { AlertTriangle } from 'lucide-react';

export default function Alerts({ alerts }: { alerts: any[] }) {
    if (alerts.length === 0) return null;

    return (
        <div className="bg-yellow-50 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded-md">
            <div className="flex items-center gap-2">
                <AlertTriangle size={20} />
                <strong>Alerts:</strong>
                <ul className="ml-4 list-disc">
                    {alerts.map((alert, i) => <li key={i}>{alert.message}</li>)}
                </ul>
            </div>
        </div>
    );
}