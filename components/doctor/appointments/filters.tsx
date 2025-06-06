import { Appointment } from '@/types/appointments';
import React from 'react';
import { DateRange } from 'react-date-range';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';


export interface FiltersProps {
    search: string;
    setSearch: React.Dispatch<React.SetStateAction<string>>;
    statusFilter: 'all' | Appointment['status'];
    setStatusFilter: React.Dispatch<React.SetStateAction<'all' | Appointment['status']>>;
    timeFormat: '12h' | '24h';
    setTimeFormat: React.Dispatch<React.SetStateAction<'12h' | '24h'>>;
    dateRange: 'all' | 'today' | 'thisWeek' | 'custom';
    setDateRange: React.Dispatch<React.SetStateAction<'all' | 'today' | 'thisWeek' | 'custom'>>;
    customRange: { startDate: Date | null; endDate: Date | null };
    setCustomRange: React.Dispatch<React.SetStateAction<{ startDate: Date | null; endDate: Date | null }>>;

}

const Filters: React.FC<FiltersProps> = ({
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    dateRange,
    setDateRange,
    customRange,
    setCustomRange,
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
        {dateRange === 'custom' && (
            <DateRange
                editableDateInputs={true}
                onChange={(item) => setCustomRange({
                    startDate: item.selection.startDate ?? null,
                    endDate: item.selection.endDate ?? null,
                })}
                moveRangeOnFirstSelection={false}
                ranges={[{
                    startDate: customRange.startDate || new Date(),
                    endDate: customRange.endDate || new Date(),
                    key: 'selection',
                }]}
            />
        )}
    </div>
);

export default Filters;