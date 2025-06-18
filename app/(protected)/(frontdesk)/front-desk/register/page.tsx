

import React from 'react'
import RegisterPatientComponent from '@/components/front-desk/components/register-patient'

import { SearchParamProps } from "@/types";



const Patients = async ({ params: { userId } }: SearchParamProps) => {

    // const user = await registerPatient();

    return (
        <RegisterPatientComponent />
        // <PatientOnboarding />
    )
}

export default Patients