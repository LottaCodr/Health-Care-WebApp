"use client"
import React, { useEffect, useState } from 'react';


export interface Appointment {
    id: string;
    patientName: string;
    doctor: string;
    date: string; // ISO date or display format
    time: string; // 12h or 24h time string
    status: 'upcoming' | 'completed' | 'cancelled'; // extend as needed
}

const AppointmentsComponent = () => {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        setTimeout(() => {
            setAppointments([
                { id: '1', patientName: 'John Doe', doctor: 'Dr. Smith', date: '2025-05-22', time: '10:00 AM', status: 'upcoming' },
                { id: '2', patientName: 'Jane Doe', doctor: 'Dr. Adams', date: '2025-05-23', time: '02:00 PM', status: 'completed' },
            ]);
            setLoading(false);
        }, 1200);
    }, []);

    const handleEdit = (id: string) => {
        alert(`Edit appointment ${id}`);
    };

    const handleDelete = (id: string) => {
        if (confirm('Are you sure you want to delete this appointment?')) {
            setAppointments((prev) => prev.filter((app) => app.id !== id));
        }
    };

    const filteredAppointments = appointments.filter((a) =>
        a.patientName.toLowerCase().includes(search.toLowerCase()) ||
        a.doctor.toLowerCase().includes(search.toLowerCase())
    );

    // Spinner Component
    const Spinner = () => (
        <div className="flex justify-center items-center h-40">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    // SkeletonRow Component
    const SkeletonRow = () => (
        <div className="flex items-center space-x-4 p-4 bg-white shadow rounded-md">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/6"></div>
            <div className="h-4 bg-gray-200 rounded w-1/12"></div>
        </div>
    );

    // AppointmentsTable Component
    const AppointmentsTable = ({ appointments, onEdit, onDelete }: {
        appointments: Appointment[];
        onEdit: (id: string) => void;
        onDelete: (id: string) => void;
    }) => (
        <div className="overflow-x-auto bg-white shadow rounded-md">
            <table className="min-w-full">
                <thead className="bg-gray-100">
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
                        <tr key={a.id} className="border-t">
                            <td className="px-4 py-2">{a.patientName}</td>
                            <td className="px-4 py-2">{a.doctor}</td>
                            <td className="px-4 py-2">{a.date}</td>
                            <td className="px-4 py-2">{a.time}</td>
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

    // SearchInput Component
    const SearchInput = ({ value, onChange, placeholder }: {
        value: string;
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
        placeholder?: string;
    }) => (
        <input
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className="border border-gray-300 rounded px-3 py-2 w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
    );

    // Pagination Component
    const Pagination = ({ currentPage, totalPages, onPageChange }: {
        currentPage: number;
        totalPages: number;
        onPageChange: (page: number) => void;
    }) => (
        <div className="flex justify-end space-x-2 pt-4">
            {Array.from({ length: totalPages }, (_, i) => (
                <button
                    key={i}
                    onClick={() => onPageChange(i + 1)}
                    className={`px-3 py-1 rounded ${currentPage === i + 1 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'}`}
                >
                    {i + 1}
                </button>
            ))}
        </div>
    );

    return (
        <div className="space-y-6 mx-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Appointments</h2>
                <SearchInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search patient or doctor..." />
            </div>

            {loading ? (
                <div className="space-y-2 animate-pulse">
                    {[...Array(4)].map((_, i) => (
                        <SkeletonRow key={i} />
                    ))}
                </div>
            ) : (
                <AppointmentsTable
                    appointments={filteredAppointments}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                />
            )}

            <Pagination currentPage={1} totalPages={1} onPageChange={() => { }} />
        </div>
    );
};

export default AppointmentsComponent;
