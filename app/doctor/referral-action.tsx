import React from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/auth-provider';

const ReferralAction = () => {
    const router = useRouter();
    const { user } = useAuth();

    // Redirect if not authorized
    if (!user || user.role !== 'Doctor') {
        router.push('/unauthorized');
        return null;
    }

    return (
        <div>
            <h1>Referral Action</h1>
            {/* Logic for sending referrals goes here */}
        </div>
    );
};

export default ReferralAction;