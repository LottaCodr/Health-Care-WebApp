import StatCard from '@/components/StatCard'
import { columns } from '@/components/table/columns'
import { DataTable } from '@/components/table/DataTable'
import { getRecentAppointmentList } from '@/lib/actions/appointment.action'
import { MdLocalHospital, MdPeople, MdExitToApp } from 'react-icons/md'


import React from 'react'
import StatCardSkeleton from '@/components/statcard/skeleton'




const Dashboard = async () => {
    const appointments = await getRecentAppointmentList();


    return (
        <div className='mx-6 flex max-w-full flex-col space-y-14'>


            <main className='admin-main'>
                <section className='w-full space-y-4'>
                    <h1 className='header'> Welcome</h1>
                </section>

                <section className='admin-stat'>
                    {appointments ? <>

                        <StatCard
                            type="admitted"
                            icon={<MdLocalHospital />}
                            label="No of Admitted Patients"
                            count={3500}
                            comparison="Compared to 2300 last quarter"
                        />
                        <StatCard
                            type="staff"
                            icon={<MdPeople />}
                            label="Number of Staffs on Duty"
                            count={120}
                        />
                        <StatCard
                            type="discharged"
                            icon={<MdExitToApp />}
                            label="No of Discharged Patients"
                            count={3100}
                            comparison="Compared to 2700 last quarter"
                        />
                    </> : (
                        <>
                            <StatCardSkeleton type="admitted" />
                            <StatCardSkeleton type="staff" />
                            <StatCardSkeleton type="discharged" />
                        </>
                    )
                    }
                </section>

                <DataTable columns={columns} data={appointments.documents} />
            </main>
        </div>
    )
}

export default Dashboard