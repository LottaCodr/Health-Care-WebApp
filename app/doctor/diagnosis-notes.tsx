import React from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/hooks/use-auth';

const DiagnosisNotesForm = () => {
    const router = useRouter();
    const { user } = useAuth();

    // Redirect if not authorized
    if (!user || user.role !== 'Doctor') {
        router.push('/unauthorized');
        return null;
    }

    return (
        <div>
            <h1>Diagnosis & Notes</h1>
            {/* Logic for entering diagnosis and notes goes here */}
        </div>
    );
};

export default DiagnosisNotesForm;