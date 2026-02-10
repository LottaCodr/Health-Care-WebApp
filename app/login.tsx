import React from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/auth-provider';

const LoginScreen = () => {
    const router = useRouter();
    const { login } = useAuth();

    const handleLogin = async (email: string, password: string) => {
        await login(email, password);
        router.push('/'); // Redirect to dashboard based on role
    };

    return (
        <div>
            <h1>Login</h1>
            <button onClick={() => handleLogin('frontdesk@example.com', 'password')}>Login as Front Desk</button>
            <button onClick={() => handleLogin('doctor@example.com', 'password')}>Login as Doctor</button>
            <button onClick={() => handleLogin('nurse@example.com', 'password')}>Login as Nurse</button>
            <button onClick={() => handleLogin('technician@example.com', 'password')}>Login as Lab Technician</button>
            <button onClick={() => handleLogin('pharmacist@example.com', 'password')}>Login as Pharmacist</button>
        </div>
    );
};

export default LoginScreen;