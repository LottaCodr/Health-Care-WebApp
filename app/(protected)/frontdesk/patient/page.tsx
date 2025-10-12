

import React from 'react'

import { SearchParamProps } from "@/types";
import PatientsComponent from '@/components/doctor/patients';
import { getAllPatients } from '@/actions/patients/get.patients';



const Patients = async ({ params: { userId } }: SearchParamProps) => {

    const documents = await getAllPatients()


    return (
        <PatientsComponent thePatients={documents} />
    )
}

export default Patients