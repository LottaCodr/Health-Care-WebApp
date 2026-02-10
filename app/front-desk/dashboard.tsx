import React from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/auth-provider';
import { PatientRegistrationForm } from '../components/PatientRegistrationForm';

const FrontDeskDashboard = () => {
    const router = useRouter();
    const { user } = useAuth();

    // Redirect if not authorized
    if (!user || user.role !== 'Front Desk') {
        router.push('/unauthorized');
        return null;
    }

    return (
        <div>
            <h1>Front Desk Dashboard</h1>
            <PatientRegistrationForm />
            {/* Additional components for patient queue, etc. */}
        </div>
    );
};

export default FrontDeskDashboard;