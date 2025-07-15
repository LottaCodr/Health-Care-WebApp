import React, { useMemo, useState } from 'react';
import { Calendar, momentLocalizer, Views } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Appointment } from '@/actions/appointments/types';

const localizer = momentLocalizer(moment);

type CalendarViewProps = {
    appointments: Appointment[];
    onEdit: (appt: Appointment) => void;
};

const eventStyleGetter = (event: any) => {
    return {
        style: {
            backgroundColor: '#fee2e2', // Tailwind red-100
            color: '#b91c1c', // Tailwind red-700
            borderRadius: '8px',
            border: '1px solid #fecaca', // Tailwind red-200
            fontWeight: 500,
            padding: '2px 6px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
            cursor: 'pointer',
        }
    };
};

const CustomEvent = ({ event }: { event: any }) => (
    <div className="flex flex-col">
        <span className="font-semibold">{event.title}</span>
        {event.note && (
            <span className="text-xs text-gray-500">{event.note}</span>
        )}
    </div>
);

const CustomToolbar = (toolbar: any) => {
    const goToBack = () => {
        toolbar.onNavigate('PREV');
    };
    const goToNext = () => {
        toolbar.onNavigate('NEXT');
    };
    const goToToday = () => {
        toolbar.onNavigate('TODAY');
    };

    const label = toolbar.label;

    return (
        <div className="flex items-center justify-between mb-4 px-2">
            <div className="flex gap-2">
                <button
                    className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium"
                    onClick={goToBack}
                    aria-label="Previous"
                >
                    &#8592;
                </button>
                <button
                    className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium"
                    onClick={goToToday}
                >
                    Today
                </button>
                <button
                    className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium"
                    onClick={goToNext}
                    aria-label="Next"
                >
                    &#8594;
                </button>
            </div>
            <span className="text-lg font-bold text-red-700">{label}</span>
            <div>
                <select
                    className="px-2 py-1 rounded border border-gray-200 text-sm"
                    value={toolbar.view}
                    onChange={e => toolbar.onView(e.target.value)}
                >
                    <option value="month">Month</option>
                    <option value="week">Week</option>
                    <option value="day">Day</option>
                    <option value="agenda">Agenda</option>
                </select>
            </div>
        </div>
    );
};

const CalendarView = ({ appointments, onEdit }: CalendarViewProps) => {
    const [selectedEvent, setSelectedEvent] = useState<any | null>(null);

    const events = useMemo(() =>
        appointments.map((a) => {
            // Assume 30 min duration for end time
            const start = new Date(`${a.date}T${a.time}`);
            const end = new Date(start.getTime() + 30 * 60 * 1000);
            return {
                ...a,
                title: a.patientName,
                start,
                end,
                allDay: false,
                note: a.notes || "",
            };
        }), [appointments]
    );

    return (
        <div className="mt-6 bg-white rounded-lg shadow border p-4">
            <Calendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                style={{ height: 550 }}
                views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
                defaultView={Views.WEEK}
                popup
                eventPropGetter={eventStyleGetter}
                components={{
                    event: CustomEvent,
                    toolbar: CustomToolbar,
                }}
                onSelectEvent={(event) => {
                    setSelectedEvent(event);
                    const original = appointments.find(a =>
                        a.patientName === event.patientName &&
                        new Date(`${a.date}T${a.time}`).getTime() === new Date(event.start).getTime()
                    );
                    if (original) {
                        setTimeout(() => onEdit(original), 150); // slight delay for UX
                    }
                }}
                messages={{
                    today: 'Today',
                    previous: 'Back',
                    next: 'Next',
                    month: 'Month',
                    week: 'Week',
                    day: 'Day',
                    agenda: 'Agenda',
                    noEventsInRange: 'No appointments in this range.',
                }}
            />
            {/* Optionally, show a tooltip or modal for selectedEvent */}
        </div>
    );
};

export default CalendarView;
