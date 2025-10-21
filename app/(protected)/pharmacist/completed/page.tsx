import PatientsComponent from '@/components/doctor/patients'
import { getAllPatients } from '@/actions/front-desk/get.patients'



const CompletedPatientsPage = async () => {
    const documents = await getAllPatients()

    return (
        <PatientsComponent
            thePatients={documents}

        />
    )
}

export default CompletedPatientsPage