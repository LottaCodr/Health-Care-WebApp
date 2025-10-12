
import React from 'react'
import PatientsComponent from '@/components/doctor/patients'
import { getAllPatients } from '@/actions/patients/get.patients'


const Patients = async () => {

    const documents = await getAllPatients()


    return (
        <PatientsComponent
            thePatients={documents}

        />
    )
}

export default Patients