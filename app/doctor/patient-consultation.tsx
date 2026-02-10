import React from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/auth-provider';

const PatientConsultationScreen = () => {
    const router = useRouter();
    const { user } = useAuth();

    // Redirect if not authorized
    if (!user || user.role !== 'Doctor') {
        router.push('/unauthorized');
        return null;
    }

    return (
        <div>
            <h1>Patient Consultation</h1>
            {/* Logic for patient consultation goes here */}
        </div>
    );
};

export default PatientConsultationScreen;