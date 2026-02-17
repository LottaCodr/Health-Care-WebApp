import React from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/auth-provider';

const PatientQueue = () => {
    const router = useRouter();
    const { user } = useAuth();

    // Redirect if not authorized
    if (!user || user.role !== 'Front Desk') {
        router.push('/unauthorized');
        return null;
    }

    return (
        <div>
            <h1>Patient Queue</h1>
            {/* Logic to display patient queue goes here */}
        </div>
    );
};

export default PatientQueue;