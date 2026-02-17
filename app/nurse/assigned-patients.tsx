import React from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/auth-provider';

const AssignedPatientsList = () => {
    const router = useRouter();
    const { user } = useAuth();

    // Redirect if not authorized
    if (!user || user.role !== 'Nurse') {
        router.push('/unauthorized');
        return null;
    }

    return (
        <div>
            <h1>Assigned Patients</h1>
            {/* Logic to display assigned patients goes here */}
        </div>
    );
};

export default AssignedPatientsList;