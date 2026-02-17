import React from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/auth-provider';

const PrescriptionForm = () => {
    const router = useRouter();
    const { user } = useAuth();

    // Redirect if not authorized
    if (!user || user.role !== 'Doctor') {
        router.push('/unauthorized');
        return null;
    }

    return (
        <div>
            <h1>Prescription Form</h1>
            {/* Logic for entering prescription details goes here */}
        </div>
    );
};

export default PrescriptionForm;