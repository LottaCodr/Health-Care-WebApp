import StatCard from '@/components/StatCard'
import { columns } from '@/components/doctor/table/columns'
import { DataTable } from '@/components/doctor/table/DataTable'
import { getRecentAppointmentList } from '@/lib/actions/appointment.action'

import React from 'react'
import AppointmentsComponent from '@/components/appointments'




const AppointmentsPage = async () => {


    return (
        <AppointmentsComponent/>
    )
}

export default AppointmentsPage