import React from 'react';

function formatDate(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function Avatar({ name }: { name: string }) {
    const initial = name?.[0]?.toUpperCase() || '?';
    return (
        <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-red-100 dark:bg-gray-800 text-red-700 dark:text-red-200 font-bold mr-3 shadow-sm border border-red-200 dark:border-gray-700">
            {initial}
        </span>
    );
}

export default function DispensedHistoryTable({ data }: { data: any[] }) {
    return (
        <div className="bg-white dark:bg-gray-900 border border-red-200 dark:border-gray-700 rounded-2xl w-full overflow-x-auto mt-8 shadow-lg">
            <div className="flex items-center justify-between px-6 pt-6 pb-3 border-b border-red-100 dark:border-gray-700">
                <h2 className="text-xl font-bold flex items-center gap-3 text-red-700 dark:text-red-200">
                    <span className="inline-block w-3 h-3 rounded-full bg-red-500 animate-pulse shadow"></span>
                    Dispensed History
                </h2>
                <span className="text-xs bg-red-100 dark:bg-gray-800 text-red-700 dark:text-red-200 px-3 py-1.5 rounded-full font-semibold shadow-sm">
                    {data.length} Record{data.length !== 1 ? 's' : ''}
                </span>
            </div>
            <table className="min-w-full text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
                <thead className="bg-red-50 dark:bg-gray-800">
                    <tr>
                        <th className="px-6 py-4 text-left font-bold text-red-700 dark:text-red-200 tracking-wide uppercase">Patient</th>
                        <th className="px-6 py-4 text-left font-bold text-red-700 dark:text-red-200 tracking-wide uppercase">Medications</th>
                        <th className="px-6 py-4 text-left font-bold text-red-700 dark:text-red-200 tracking-wide uppercase">Dispensed By</th>
                        <th className="px-6 py-4 text-left font-bold text-red-700 dark:text-red-200 tracking-wide uppercase">Date</th>
                    </tr>
                </thead>
                <tbody>
                    {data.length === 0 ? (
                        <tr>
                            <td colSpan={4} className="p-12 text-center text-red-300">
                                <div className="flex flex-col items-center gap-3">
                                    <svg width="40" height="40" fill="none" className="mx-auto mb-2 text-red-200" viewBox="0 0 24 24">
                                        <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zm-1-7v-4h2v4h-2zm0 2h2v2h-2v-2z" fill="currentColor" />
                                    </svg>
                                    <span className="text-base text-red-400 font-medium">No dispensed history found</span>
                                </div>
                            </td>
                        </tr>
                    ) : data.map((item) => (
                        <tr
                            key={item.id}
                            className="border-t border-red-100 hover:bg-red-50/60 dark:border-gray-700 dark:hover:bg-gray-800 transition duration-150"
                        >
                            <td className="px-6 py-4 font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">
                                <div className="flex items-center gap-3">
                                    <Avatar name={item.patientName} />
                                    <span className="text-base">{item.patientName}</span>
                                </div>
                            </td>
                            <td className="px-6 py-4 text-gray-700 dark:text-gray-300">
                                <ul className="list-disc pl-5 space-y-1">
                                    {item.medications.map((med: string, idx: number) => (
                                        <li key={idx} className="text-xs text-gray-800 dark:text-gray-200 bg-red-50 dark:bg-gray-800 rounded px-2 py-0.5 inline-block">
                                            {med}
                                        </li>
                                    ))}
                                </ul>
                            </td>
                            <td className="px-6 py-4 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                    <span className="inline-block w-8 h-8 rounded-full bg-red-200 dark:bg-gray-700 text-red-700 dark:text-red-200 flex items-center justify-center font-bold uppercase text-sm border border-red-300 dark:border-gray-700 shadow-sm">
                                        {item.dispensedBy?.[0]?.toUpperCase() || "?"}
                                    </span>
                                    <span className="text-sm font-medium">{item.dispensedBy}</span>
                                </div>
                            </td>
                            <td className="px-6 py-4 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                                <span className="bg-red-50 dark:bg-gray-800 text-red-700 dark:text-red-200 px-2 py-1 rounded font-mono text-xs">
                                    {formatDate(item.date)}
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}