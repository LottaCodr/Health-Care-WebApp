import React from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/auth-provider';

const LabTestRequestForm = () => {
    const router = useRouter();
    const { user } = useAuth();

    // Redirect if not authorized
    if (!user || user.role !== 'Doctor') {
        router.push('/unauthorized');
        return null;
    }

    return (
        <div>
            <h1>Lab Test Request</h1>
            {/* Logic for requesting lab tests goes here */}
        </div>
    );
};

export default LabTestRequestForm;