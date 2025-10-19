
import React from 'react'
import PatientsComponent from '@/components/doctor/patients'
import { getAllPatients } from '@/actions/front-desk/get.patients'


const Patients = async () => {

    const documents = await getAllPatients()


    return (
        <PatientsComponent
            thePatients={documents}

        />
    )
}

export default Patients