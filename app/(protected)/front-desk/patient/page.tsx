
import React from 'react'

import { SearchParamProps } from "@/types";
import PatientsComponent from '@/components/patients';
import { getAllPatients } from '@/lib/supabase-service';

const Patients = async ({ params: { userId } }: SearchParamProps) => {
    const documents = await getAllPatients();

    return (
        <PatientsComponent thePatients={documents} />
    );
}

export default Patients
