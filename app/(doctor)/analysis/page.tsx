import StatCard from '@/components/StatCard'
import { columns } from '@/components/doctor/table/columns'
import { DataTable } from '@/components/doctor/table/DataTable'
import { getRecentAppointmentList } from '@/lib/actions/appointment.action'

import React from 'react'




const Analysis = async () => {
    const appointments = await getRecentAppointmentList();


    return (
        <div className='mx-auto flex max-w-full flex-col space-y-14'>


            <main className='admin-main'>
                Analysis Page
            </main>
        </div>
    )
}

export default Analysis