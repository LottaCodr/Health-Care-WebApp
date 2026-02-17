import React from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/auth-provider';

const TreatmentNursingActionsScreen = () => {
    const router = useRouter();
    const { user } = useAuth();

    // Redirect if not authorized
    if (!user || user.role !== 'Nurse') {
        router.push('/unauthorized');
        return null;
    }

    return (
        <div>
            <h1>Treatment / Nursing Actions</h1>
            {/* Logic for nursing actions goes here */}
        </div>
    );
};

export default TreatmentNursingActionsScreen;