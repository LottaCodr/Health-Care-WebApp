import StatCard from '@/components/StatCard'
import { columns } from '@/components/doctor/table/columns'
import { DataTable } from '@/components/doctor/table/DataTable'
import { getRecentAppointmentList } from '@/lib/actions/appointment.action'

import React from 'react'




const Settings = async () => {


    return (
        <div className='mx-auto flex max-w-full flex-col space-y-14'>


            <main className='admin-main'>
                Settings Page
            </main>
        </div>
    )
}

export default Settings