import React from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/auth-provider';

const TestResultUploadScreen = () => {
    const router = useRouter();
    const { user } = useAuth();

    // Redirect if not authorized
    if (!user || user.role !== 'Lab Technician') {
        router.push('/unauthorized');
        return null;
    }

    return (
        <div>
            <h1>Test Result Upload</h1>
            {/* Logic for uploading test results goes here */}
        </div>
    );
};

export default TestResultUploadScreen;