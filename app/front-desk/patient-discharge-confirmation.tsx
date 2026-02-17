import React from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/auth-provider';

const PatientDischargeConfirmation = () => {
    const router = useRouter();
    const { user } = useAuth();

    // Redirect if not authorized
    if (!user || user.role !== 'Front Desk') {
        router.push('/unauthorized');
        return null;
    }

    return (
        <div>
            <h1>Patient Discharge Confirmation</h1>
            {/* Logic for confirming patient discharge goes here */}
        </div>
    );
};

export default PatientDischargeConfirmation;