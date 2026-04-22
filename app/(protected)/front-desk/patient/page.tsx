
import React from 'react'

import { SearchParamProps } from "@/types";
import PatientsComponent from '@/components/patients';

const Patients = async ({ params: { userId } }: SearchParamProps) => {

    return (
        <PatientsComponent  />
    );
}

export default Patients
