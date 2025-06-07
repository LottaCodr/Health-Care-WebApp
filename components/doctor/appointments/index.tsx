'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Filters from './filters';
import AppointmentTable from './table';
import CalendarView from './calendar-view';
import AppointmentModal from './modal';
import { Appointment } from '@/types/appointments';
import { toast } from 'react-hot-toast';
import { useRealTimeAppointments } from '@/context/appointments/appointment.reducer';

const AppointmentsComponent = ({ currentDoctor }: { currentDoctor?: string }) => {
    const { state, dispatch } = useRealTimeAppointments();
    const { appointments, loading } = state;

    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | Appointment['status']>('all');
    const [timeFormat, setTimeFormat] = useState<'12h' | '24h'>('12h');
    const [dateRange, setDateRange] = useState<'all' | 'today' | 'thisWeek' | 'custom'>('all');
    const [customRange, setCustomRange] = useState<{ startDate: Date | null; endDate: Date | null }>({ startDate: null, endDate: null });
    const [sortBy, setSortBy] = useState<'date' | 'patientName'>('date');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [page, setPage] = useState(1);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<Appointment | null>(null);

    const pageSize = 10;

    const filtered = useMemo(() => {
        interface FilteredAppointment extends Appointment { }

        interface CustomRange {
            startDate: Date | null;
            endDate: Date | null;
        }

        return appointments.filter((a: FilteredAppointment): boolean => {
            const matchesSearch: boolean = a.patientName.toLowerCase().includes(search.toLowerCase());
            const matchesStatus: boolean = statusFilter === 'all' || a.status === statusFilter;
            const isDoctor: boolean = !currentDoctor || a.doctor === currentDoctor;
            const matchesDate: boolean = (() => {
                const date: Date = new Date(a.date);
                if (dateRange === 'today') {
                    return date.toDateString() === new Date().toDateString();
                }
                if (dateRange === 'thisWeek') {
                    const now: Date = new Date();
                    const start: Date = new Date(now.setDate(now.getDate() - now.getDay()));
                    const end: Date = new Date(start);
                    end.setDate(start.getDate() + 6);
                    return date >= start && date <= end;
                }
                if (dateRange === 'custom' && customRange.startDate && customRange.endDate) {
                    return (
                        date >= customRange.startDate &&
                        date <= customRange.endDate
                    );
                }
                return true;
            })();

            return matchesSearch && matchesStatus && isDoctor && matchesDate;
        });
    }, [appointments, search, statusFilter, currentDoctor, dateRange, customRange]);

    const sortedAppointments = useMemo(() => {
        return [...filtered].sort((a, b) => {
            const valA = sortBy === 'date' ? new Date(a.date).getTime() : a.patientName.toLowerCase();
            const valB = sortBy === 'date' ? new Date(b.date).getTime() : b.patientName.toLowerCase();

            if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
            if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });
    }, [filtered, sortBy, sortOrder]);

    const paginated = useMemo(() => {
        const start = (page - 1) * pageSize;
        return sortedAppointments.slice(start, start + pageSize);
    }, [sortedAppointments, page]);

    useEffect(() => {
        setPage(1);
    }, [search, statusFilter, dateRange, customRange, currentDoctor]);

    const handleEdit = (id: string) => {
        const appt: Appointment | null = appointments.find((a: Appointment) => a.id === id) || null;
        setEditing(appt);
        setShowModal(true);
    };

    const handleDelete = (id: string) => {
        dispatch({ type: 'DELETE_APPOINTMENT', payload: id });
        toast.success('Appointment deleted');
    };

    const handleCreate = () => {
        setEditing(null);
        setShowModal(true);
    };

    const handleSave = (updated: Appointment) => {
        const exists: Appointment | undefined = appointments.find((a: Appointment) => a.id === updated.id);
        if (exists) {
            dispatch({ type: 'UPDATE_APPOINTMENT', payload: updated });
            toast.success('Appointment updated');
        } else {
            dispatch({ type: 'ADD_APPOINTMENT', payload: updated });
            toast.success('Appointment created');
        }
        setShowModal(false);
    };

    return (
        <div className="space-y-6 max-w-7xl mx-6 px-4 sm:px-6 py-8">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                    Doctor&#39;s Appointments
                </h2>
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
                // loading={loading}
            />

            <CalendarView appointments={filtered} onEdit={(appt) => handleEdit(appt.id)} />

            {showModal && (
                <AppointmentModal
                    isOpen={showModal}
                    initialData={editing}
                    onClose={() => setShowModal(false)}
                    onSave={handleSave}
                />
            )}
        </div>
    );
};

export default AppointmentsComponent;
