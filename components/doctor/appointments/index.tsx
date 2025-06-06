// File: components/appointments/AppointmentsComponent.tsx

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { fetchAppointments } from '@/actions/appointments/get.appointment';
import useRealTimeAppointments from '@/hooks/use-realtime-appointment';
import Filters from './filters';
import AppointmentTable from './table';
import CalendarView from './calendar-view';
import AppointmentModal from './modal';
import { Appointment } from '@/types/appointments';


const AppointmentsComponent = ({ currentDoctor }: { currentDoctor?: string }) => {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | Appointment['status']>('all');
    const [timeFormat, setTimeFormat] = useState<'12h' | '24h'>('12h');
    const [dateRange, setDateRange] = useState<'all' | 'today' | 'thisWeek'>('all');
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<Appointment | null>(null);
    const realTimeAppointments = useRealTimeAppointments();

    useEffect(() => {
        fetchAppointments().then(setAppointments);
    }, []);

    useEffect(() => {
        if (realTimeAppointments) setAppointments(realTimeAppointments);
    }, [realTimeAppointments]);

    const filtered = useMemo(() => {
        return appointments.filter((a) => {
            const matchesSearch = a.patientName.toLowerCase().includes(search.toLowerCase());
            const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
            const isDoctor = !currentDoctor || a.doctor === currentDoctor;
            const matchesDate = (() => {
                const today = new Date();
                const date = new Date(a.date);
                if (dateRange === 'today') {
                    return (
                        date.getDate() === today.getDate() &&
                        date.getMonth() === today.getMonth() &&
                        date.getFullYear() === today.getFullYear()
                    );
                }
                if (dateRange === 'thisWeek') {
                    const now = new Date();
                    const start = new Date(now);
                    start.setDate(now.getDate() - now.getDay()); // Sunday
                    start.setHours(0, 0, 0, 0);

                    const end = new Date(start);
                    end.setDate(start.getDate() + 6);
                    end.setHours(23, 59, 59, 999);

                    return date >= start && date <= end;
                }
                
                return true;
            })();
            return matchesSearch && matchesStatus && isDoctor && matchesDate;
        });
    }, [appointments, search, statusFilter, currentDoctor, dateRange]);

    const handleEdit = (id: string) => {
        const appt = appointments.find((a) => a.id === id) || null;
        setEditing(appt);
        setShowModal(true);
    };

    const handleDelete = (id: string) => {
        setAppointments((prev) => prev.filter((a) => a.id !== id));
    };

    const handleCreate = () => {
        setEditing(null);
        setShowModal(true);
    };

    return (
        <div className="space-y-6 max-w-7xl mx-6 px-4 sm:px-6 py-8">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Doctor&#39;s Appointments</h2>
                <div className="flex items-center gap-3">
                    <Filters
                        search={search}
                        setSearch={setSearch}
                        statusFilter={statusFilter}
                        setStatusFilter={setStatusFilter}
                        timeFormat={timeFormat}
                        setTimeFormat={setTimeFormat}
                        dateRange={dateRange}
                        setDateRange={setDateRange}
                    />
                    <button
                        onClick={handleCreate}
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                        aria-label="Create appointment"
                    >
                        + New
                    </button>
                </div>
            </div>
            <AppointmentTable
                appointments={filtered}
                onEdit={handleEdit}
                onDelete={handleDelete}
                timeFormat={timeFormat}
            />
            <CalendarView appointments={filtered} onEdit={(appt: Appointment) => handleEdit(appt.id)} />

            {showModal && (
                <AppointmentModal
                    isOpen={showModal}
                    initialData={editing} // ✅
                    onClose={() => setShowModal(false)}
                    onSave={(updated) => {
                        setAppointments((prev) => {
                            const exists = prev.find((a) => a.id === updated.id);
                            if (exists) {
                                return prev.map((a) => (a.id === updated.id ? updated : a));
                            }
                            return [...prev, updated];
                        });
                        setShowModal(false);
                    }}
                />
            
            
            )}
        </div>
    );
};

export default AppointmentsComponent;