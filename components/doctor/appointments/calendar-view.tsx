import React from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';

import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Appointment } from '@/types/appointments';

const localizer = momentLocalizer(moment);

type CalendarViewProps = {
    appointments: Appointment[];
    onEdit: (appt: Appointment) => void;
};


const CalendarView = ({ appointments, onEdit }: CalendarViewProps) => {
    const events = appointments.map((a) => ({
        title: a.patientName,
        start: new Date(`${a.date}T${a.time}`),
        end: new Date(`${a.date}T${a.time}`),
        allDay: false,
    }));

    return (
        <div className="mt-6">
            <Calendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                style={{ height: 500 }}
                onSelectEvent={(event) => {
                    const original = appointments.find(a =>
                        new Date(`${a.date}T${a.time}`).getTime() === new Date(event.start).getTime()
                    );
                    if (original) onEdit(original);
                }}
            />
        </div>
    );
};

export default CalendarView;
