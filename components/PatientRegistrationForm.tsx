import React, { useState } from 'react';
import { createPatient } from '../lib/api';

export const PatientRegistrationForm = () => {
    const [name, setName] = useState('');
    const [age, setAge] = useState('');
    const [gender, setGender] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    interface PatientData {
        name: string;
        age: string;
        gender: string;
    }

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await createPatient({ name, age, gender } as PatientData);
            // Handle success (e.g., redirect or show success message)
        } catch (err) {
            setError('Failed to register patient.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <h2>Register Patient</h2>
            <input type="text" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
            <input type="number" placeholder="Age" value={age} onChange={(e) => setAge(e.target.value)} required />
            <select value={gender} onChange={(e) => setGender(e.target.value)} required>
                <option value="">Select Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
            </select>
            <button type="submit" disabled={loading}>{loading ? 'Registering...' : 'Register'}</button>
            {error && <p>{error}</p>}
        </form>
    );
};