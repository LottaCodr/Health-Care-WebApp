import React from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/auth-provider';

const DispensedHistoryScreen = () => {
    const router = useRouter();
    const { user } = useAuth();

    // Redirect if not authorized
    if (!user || user.role !== 'Pharmacist') {
        router.push('/unauthorized');
        return null;
    }

    return (
        <div>
            <h1>Dispensed History</h1>
            {/* Logic to display dispensed history goes here */}
        </div>
    );
};

export default DispensedHistoryScreen;