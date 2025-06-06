'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { fetchAppointments } from '@/actions/appointments/get.appointment';
import useRealTimeAppointments from '@/hooks/use-realtime-appointment';
import Filters from './filters';
import AppointmentTable from './table';
import CalendarView from './calendar-view';
import AppointmentModal from './modal';
import { Appointment } from '@/types/appointments';
import { toast } from 'react-hot-toast';

const AppointmentsComponent = ({ currentDoctor }: { currentDoctor?: string }) => {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | Appointment['status']>('all');
    const [timeFormat, setTimeFormat] = useState<'12h' | '24h'>('12h');
    const [dateRange, setDateRange] = useState<'all' | 'today' | 'thisWeek' | 'custom'>('all');
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<Appointment | null>(null);
    const realTimeAppointments = useRealTimeAppointments();
    const [customRange, setCustomRange] = useState<{ startDate: Date | null; endDate: Date | null }>({ startDate: null, endDate: null });
    const [sortBy, setSortBy] = useState<'date' | 'patientName'>('date');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [page, setPage] = useState(1);
    const pageSize = 10;

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
                const date = new Date(a.date);
                if (dateRange === 'today') {
                    return date.toDateString() === new Date().toDateString();
                }
                if (dateRange === 'thisWeek') {
                    const now = new Date();
                    const start = new Date(now.setDate(now.getDate() - now.getDay()));
                    const end = new Date(start);
                    end.setDate(start.getDate() + 6);
                    return date >= start && date <= end;
                }
                if (
                    dateRange === 'custom' &&
                    customRange.startDate &&
                    customRange.endDate &&
                    Object.prototype.toString.call(customRange.startDate) === '[object Date]' &&
                    Object.prototype.toString.call(customRange.endDate) === '[object Date]'
                ) {
                    return (
                        customRange.startDate instanceof Date &&
                        customRange.endDate instanceof Date &&
                        date >= customRange.startDate &&
                        date <= customRange.endDate
                    );
                }
                return true;
            })();

            return matchesSearch && matchesStatus && isDoctor && matchesDate;
        });
    }, [appointments, search, statusFilter, currentDoctor, dateRange, customRange.startDate, customRange.endDate]);

    // Sort filtered appointments
    const sortedAppointments = useMemo(() => {
        return [...filtered].sort((a, b) => {
            const valA = sortBy === 'date' ? new Date(a.date).getTime() : a.patientName.toLowerCase();
            const valB = sortBy === 'date' ? new Date(b.date).getTime() : b.patientName.toLowerCase();

            if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
            if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });
    }, [filtered, sortBy, sortOrder]);

    // Paginate sorted appointments
    const paginated = useMemo(() => {
        const start = (page - 1) * pageSize;
        return sortedAppointments.slice(start, start + pageSize);
    }, [sortedAppointments, page, pageSize]);

    // Reset page when filters change
    useEffect(() => {
        setPage(1);
    }, [search, statusFilter, dateRange, customRange.startDate, customRange.endDate, currentDoctor]);

    const handleEdit = (id: string) => {
        const appt = appointments.find((a) => a.id === id) || null;
        setEditing(appt);
        setShowModal(true);
    };

    const handleDelete = (id: string) => {
        setAppointments((prev) => prev.filter((a) => a.id !== id));
        toast.success('Appointment deleted');
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
                        customRange={customRange}
                        setCustomRange={setCustomRange}
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
                appointments={paginated}
                onEdit={handleEdit}
                onDelete={handleDelete}
                timeFormat={timeFormat}
                sortBy={sortBy}
                setSortBy={setSortBy}
                sortOrder={sortOrder}
                setSortOrder={setSortOrder}
                page={page}
                setPage={setPage}
                pageSize={pageSize}
                total={sortedAppointments.length}
            />
            <CalendarView appointments={filtered} onEdit={(appt: Appointment) => handleEdit(appt.id)} />

            {showModal && (
                <AppointmentModal
                    isOpen={showModal}
                    initialData={editing}
                    onClose={() => setShowModal(false)}
                    onSave={(updated) => {
                        setAppointments((prev) => {
                            const exists = prev.find((a) => a.id === updated.id);
                            if (exists) {
                                toast.success('Appointment updated');
                                return prev.map((a) => (a.id === updated.id ? updated : a));
                            }
                            toast.success('Appointment created');
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