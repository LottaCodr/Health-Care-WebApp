'use client';

import React from 'react';
import Loading from '@/app/useloading';
import { Appointment } from '@/actions/appointments/types';

interface AppointmentTableProps {
    appointments: Appointment[];
    sortBy: 'date' | 'patientName';
    setSortBy: (sortBy: 'date' | 'patientName') => void;
    sortOrder: 'asc' | 'desc';
    setSortOrder: (order: 'asc' | 'desc') => void;
    page: number;
    setPage: (page: number) => void;
    pageSize: number;
    total: number;
    onEdit: (id: string) => void;
    onDelete: (id: string) => void;
    timeFormat: '12h' | '24h';
    loading: boolean;
}

const formatTime = (time: string, format: '12h' | '24h') => {
    if (format === '24h') {
        const [h, modifier] = time.split(/\s+/);
        let [hour, minute] = h.split(':');
        hour = String(modifier === 'PM' ? (+hour % 12 + 12) : +hour % 12);
        return `${hour.padStart(2, '0')}:${minute}`;
    }
    return time;
};

const statusStyles: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100',
    completed: 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100',
    cancelled: 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100',
    'no-show': 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
    rescheduled: 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100',
    scheduled: 'bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-100',
};

const AppointmentTable: React.FC<AppointmentTableProps> = ({
    appointments,
    onEdit,
    onDelete,
    timeFormat,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    page,
    setPage,
    pageSize,
    total,
    loading,
}) => {
    const handleSort = (key: 'date' | 'patientName') => {
        if (sortBy === key) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(key);
            setSortOrder('asc');
        }
    };

    const renderSortHeader = (label: string, key: 'date' | 'patientName') => (
        <th
            scope="col"
            className="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-200 tracking-wide cursor-pointer select-none"
            onClick={() => handleSort(key)}
        >
            <div className="inline-flex items-center gap-1">
                {label}
                {sortBy === key && (
                    <span className="text-xs">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                )}
            </div>
        </th>
    );

    return (
        <div className="overflow-hidden border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
            <table className="min-w-full text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
                <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                        {renderSortHeader('Patient', 'patientName')}
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-200">Doctor</th>
                        {renderSortHeader('Date', 'date')}
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-200">Time</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-200">Status</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-200">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {loading ? (
                        <tr>
                            <td colSpan={6} className="text-center py-12">
                                <div className="flex justify-center items-center gap-3 text-sm text-gray-500">
                                    <Loading />
                                    Loading appointments...
                                </div>
                            </td>
                        </tr>
                    ) : appointments.length === 0 ? (
                        <tr>
                            <td colSpan={6} className="text-center py-12 text-sm text-gray-500">
                                No appointments found.
                            </td>
                        </tr>
                    ) : (
                        appointments.map((a) => (
                            <tr
                                key={a.id}
                                className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                                <td className="px-4 py-3 text-gray-800 dark:text-gray-100">{a.patientName}</td>
                                <td className="px-4 py-3 text-gray-700 dark:text-gray-200">{a.doctorName}</td>
                                <td className="px-4 py-3">{a.date}</td>
                                <td className="px-4 py-3">{formatTime(a.time, timeFormat)}</td>
                                <td className="px-4 py-3 capitalize">
                                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${statusStyles[a.status] || 'bg-gray-200 text-gray-600'}`}>
                                        {a.status}
                                    </span>
                                </td>
                                <td className="px-4 py-3 flex gap-2">
                                    <button
                                        onClick={() => onEdit(a.id)}
                                        className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => onDelete(a.id)}
                                        className="text-red-600 dark:text-red-400 hover:underline font-medium"
                                    >
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>

            {/* Pagination */}
            <div className="flex items-center justify-between p-4 border-t bg-gray-50 dark:bg-gray-700 dark:border-gray-600">
                <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 rounded-md text-sm font-medium bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 disabled:opacity-50"
                >
                    Previous
                </button>
                <span className="text-sm text-gray-600 dark:text-gray-300">
                    Page {page} of {Math.ceil(total / pageSize)}
                </span>
                <button
                    onClick={() => page * pageSize < total && setPage(page + 1)}
                    disabled={page * pageSize >= total}
                    className="px-3 py-1.5 rounded-md text-sm font-medium bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 disabled:opacity-50"
                >
                    Next
                </button>
            </div>
        </div>
    );
};

export default AppointmentTable;
