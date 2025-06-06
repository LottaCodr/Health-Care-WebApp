"use client";
import { Appointment } from '@/types/appointments';
import React from 'react';

interface AppointmentTableProps {
    appointments: Appointment[];
    onEdit: (id: string) => void;
    onDelete: (id: string) => void;
    timeFormat: '12h' | '24h';
}

const formatTime = (time: string, format: '12h' | '24h') => {
    if (format === '24h') {
        const [h, modifier] = time.split(/\s+/);
        let [hour, minute] = h.split(":");
        hour = String(modifier === 'PM' ? (+hour % 12 + 12) : +hour % 12);
        return `${hour.padStart(2, '0')}:${minute}`;
    }
    return time;
};

const AppointmentTable: React.FC<AppointmentTableProps> = ({ appointments, onEdit, onDelete, timeFormat }) => (
    <div className="overflow-x-auto bg-white dark:bg-gray-800 shadow rounded-md">
        <table className="min-w-full">
            <thead className="bg-gray-100 dark:bg-gray-700">
                <tr>
                    <th className="px-4 py-2 text-left">Patient</th>
                    <th className="px-4 py-2 text-left">Doctor</th>
                    <th className="px-4 py-2 text-left">Date</th>
                    <th className="px-4 py-2 text-left">Time</th>
                    <th className="px-4 py-2 text-left">Status</th>
                    <th className="px-4 py-2 text-left">Actions</th>
                </tr>
            </thead>
            <tbody>
                {appointments.map((a) => (
                    <tr key={a.id} className="border-t dark:border-gray-600">
                        <td className="px-4 py-2">{a.patientName}</td>
                        <td className="px-4 py-2">{a.doctor}</td>
                        <td className="px-4 py-2">{a.date}</td>
                        <td className="px-4 py-2">{formatTime(a.time, timeFormat)}</td>
                        <td className="px-4 py-2 capitalize">{a.status}</td>
                        <td className="px-4 py-2 space-x-2">
                            <button onClick={() => onEdit(a.id)} className="text-blue-600 hover:underline">Edit</button>
                            <button onClick={() => onDelete(a.id)} className="text-red-600 hover:underline">Delete</button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

export default AppointmentTable;