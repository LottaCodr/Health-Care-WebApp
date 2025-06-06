import { Appointment } from '@/types/appointments';
import React from 'react';


export interface FiltersProps {
    search: string;
    setSearch: React.Dispatch<React.SetStateAction<string>>;
    statusFilter: 'all' | Appointment['status'];
    setStatusFilter: React.Dispatch<React.SetStateAction<'all' | Appointment['status']>>;
    timeFormat: '12h' | '24h';
    setTimeFormat: React.Dispatch<React.SetStateAction<'12h' | '24h'>>;
    dateRange: 'all' | 'today' | 'thisWeek';
    setDateRange: React.Dispatch<React.SetStateAction<'all' | 'today' | 'thisWeek'>>;
}

const Filters: React.FC<FiltersProps> = ({
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    dateRange,
    setDateRange,
}) => (
    <div className="flex gap-4 flex-wrap">
        <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name..."
            className="border px-3 py-2 rounded"
        />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} className="border px-3 py-2 rounded">
            <option value="all">All Statuses</option>
            <option value="upcoming">Upcoming</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
        </select>
        <div className="flex items-center gap-2">
            <button onClick={() => setDateRange('today')} className="text-sm text-blue-500">Today</button>
            <button onClick={() => setDateRange('thisWeek')} className="text-sm text-blue-500">This Week</button>
        </div>
    </div>
);

export default Filters;