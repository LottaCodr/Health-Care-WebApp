import StatCard from '@/components/StatCard'
import { columns } from '@/components/doctor/table/columns'
import { DataTable } from '@/components/doctor/table/DataTable'
import { getRecentAppointmentList } from '@/lib/actions/appointment.action'

import React from 'react'
import PatientsComponent from '@/components/patients'




const Patients = async () => {


    return (
        <PatientsComponent />
    )
}

export default Patients