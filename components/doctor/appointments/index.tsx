'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Filters from './filters';
import AppointmentTable from './table';
import CalendarView from './calendar-view';
import AppointmentModal from './modal';
import { useRealTimeAppointments } from '@/context/appointments/appointment.reducer';
import { toast } from '@/hooks/use-toast';
import { Appointment } from '@/actions/appointments/types';

const PAGE_SIZE = 10;

const AppointmentsComponent: React.FC = () => {
    const { state, dispatch } = useRealTimeAppointments();
    const { appointments, loading } = state;

    // Local UI state
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

    // Reset pagination on filter changes
    useEffect(() => {
        setPage(1);
    }, [search, statusFilter, dateRange, customRange]);

    // Helpers
    const filterAppointments = useMemo(() => {
        return appointments.filter((appt) => {
            if (!appt || !appt.patientName) return false;

            const matchesSearch = appt.patientName.toLowerCase().includes(search.toLowerCase());
            const matchesStatus = statusFilter === 'all' || appt.status === statusFilter;

            const matchesDate = (() => {
                const date = new Date(appt.date);
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
                if (dateRange === 'custom' && customRange.startDate && customRange.endDate) {
                    return date >= customRange.startDate && date <= customRange.endDate;
                }
                return true;
            })();

            return matchesSearch && matchesStatus && matchesDate;
        });
    }, [appointments, search, statusFilter, dateRange, customRange]);

    const sortedAppointments = useMemo(() => {
        return [...filterAppointments].sort((a, b) => {
            const aValue = sortBy === 'date' ? new Date(a.date).getTime() : a.patientName.toLowerCase();
            const bValue = sortBy === 'date' ? new Date(b.date).getTime() : b.patientName.toLowerCase();

            if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });
    }, [filterAppointments, sortBy, sortOrder]);

    const paginatedAppointments = useMemo(() => {
        const start = (page - 1) * PAGE_SIZE;
        return sortedAppointments.slice(start, start + PAGE_SIZE);
    }, [sortedAppointments, page]);

    // Modal Handlers
    const handleEdit = (id: string) => {
        const appt = appointments.find((a) => a.id === id || a.id === id) || null;
        setEditing(appt);
        setShowModal(true);
    };

    const handleDelete = (id: string) => {
        dispatch({ type: 'DELETE_APPOINTMENT', payload: id });
        toast({
            title: 'Appointment deleted',
            description: 'The appointment has been deleted.',
            variant: 'destructive',
        });
    };

    const handleCreate = () => {
        setEditing(null);
        setShowModal(true);
    };



    const handleSave = (updated: Appointment) => {
        const exists = appointments.find((a) => a.id === updated.id || a.id === updated.id);

        if (exists) {
            dispatch({ type: 'UPDATE_APPOINTMENT', payload: updated });
            toast({
                title: 'Appointment updated',
                description: `Appointment with ${updated.patientName} updated.`,
            });
        } else {
            dispatch({ type: 'ADD_APPOINTMENT', payload: updated });
            toast({
                title: 'Appointment created',
                description: `Appointment with ${updated.patientName} created.`,
            });
        }

        setShowModal(false);
    };

    return (
        <div className="space-y-6 max-w-7xl mx-6 px-4 sm:px-6 py-8">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                    Doctor&apos;s Appointments
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
                    >
                        + New
                    </button>
                </div>
            </div>

            <AppointmentTable
                appointments={paginatedAppointments}
                onEdit={handleEdit}
                onDelete={handleDelete}
                timeFormat={timeFormat}
                sortBy={sortBy}
                setSortBy={setSortBy}
                sortOrder={sortOrder}
                setSortOrder={setSortOrder}
                page={page}
                setPage={setPage}
                pageSize={PAGE_SIZE}
                total={sortedAppointments.length}
                loading={loading}
            />

            <CalendarView
                appointments={filterAppointments}
                onEdit={(appt) => handleEdit(appt.id || appt.$id)}
            />

            {showModal && (
                <AppointmentModal
                    isOpen={showModal}
                    initialData={editing}
                    onClose={() => setShowModal(false)}
                    onSave={handleSave}
                    existingAppointments={filterAppointments}

                />
            )}
        </div>
    );
};

export default AppointmentsComponent;
