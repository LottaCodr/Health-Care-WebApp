import StatCard from '@/components/doctor/dashboard/statcard/stat-card'
import { columns } from '@/components/doctor/dashboard/appointment-section/table/columns'
import { DataTable } from '@/components/doctor/dashboard/appointment-section/table/DataTable'
import { getRecentAppointmentList } from '@/actions/appointment.action'

import React from 'react'
import AppointmentsComponent from '@/components/doctor/appointments'




const AppointmentsPage = async () => {


    return (
        <AppointmentsComponent />
    )
}

export default AppointmentsPage