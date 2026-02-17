import React from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/hooks/use-auth';

const PatientQueue = () => {
    const router = useRouter();
    const { user } = useAuth();

    // Redirect if not authorized
    if (!user || user.role !== 'Doctor') {
        router.push('/unauthorized');
        return null;
    }

    return (
        <div>
            <h1>Patient Queue (Awaiting Consultation)</h1>
            {/* Logic to display patient queue for doctors goes here */}
        </div>
    );
};

export default PatientQueue;