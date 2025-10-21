import React from 'react';
import { AlertTriangle } from 'lucide-react';

export default function Alerts({ alerts }: { alerts: any[] }) {
    if (!alerts || alerts.length === 0) return null;

    return (
        <div className="bg-yellow-50 dark:bg-yellow-900 border-l-4 border-yellow-500 dark:border-yellow-700 text-yellow-800 dark:text-yellow-200 p-4 md:p-6 rounded-xl shadow-sm mb-4 animate-fade-in">
            <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1">
                    <AlertTriangle size={24} className="text-yellow-500 dark:text-yellow-300" />
                </div>
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-base tracking-wide">Important Alerts</span>
                        <span className="bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 text-xs font-bold px-2 py-0.5 rounded-full">
                            {alerts.length}
                        </span>
                    </div>
                    <ul className="ml-4 list-disc space-y-1">
                        {alerts.map((alert, i) => (
                            <li
                                key={i}
                                className="text-sm leading-relaxed hover:bg-yellow-100 dark:hover:bg-yellow-800 rounded px-1 transition-colors cursor-pointer"
                                title={alert.message}
                            >
                                {alert.message}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
}