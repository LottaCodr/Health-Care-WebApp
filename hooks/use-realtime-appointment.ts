import { useEffect, useState } from 'react';
import { Appointment } from './types';

const useRealTimeAppointments = () => {
    const [appointments, setAppointments] = useState<Appointment[]>([]);

    useEffect(() => {
        const interval = setInterval(() => {
            // Replace with WebSocket or polling API
            fetch('/api/appointments')
                .then((res) => res.json())
                .then((data) => setAppointments(data));
        }, 30000);

        return () => clearInterval(interval);
    }, []);

    return appointments;
};

export default useRealTimeAppointments;