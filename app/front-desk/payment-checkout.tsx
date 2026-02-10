import React from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/auth-provider';

const PaymentCheckout = () => {
    const router = useRouter();
    const { user } = useAuth();

    // Redirect if not authorized
    if (!user || user.role !== 'Front Desk') {
        router.push('/unauthorized');
        return null;
    }

    return (
        <div>
            <h1>Payment & Checkout</h1>
            {/* Logic for payment processing goes here */}
        </div>
    );
};

export default PaymentCheckout;