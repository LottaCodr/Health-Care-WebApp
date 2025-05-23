import StatCard from '@/components/doctor/dashboard/statcard/stat-card'
import { columns } from '@/components/doctor/dashboard/appointment-section/table/columns'
import { DataTable } from '@/components/doctor/dashboard/appointment-section/table/DataTable'
import { getRecentAppointmentList } from '@/lib/actions/appointment.action'

import React from 'react'
import PatientsComponent from '@/components/doctor/patients'




const Patients = async () => {


    return (
        <PatientsComponent />
    )
}

export default Patients