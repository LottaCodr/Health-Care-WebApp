import { getAllPatients } from "@/actions/front-desk/get.patients"
import PatientsComponent from "@/components/patients"

const PatientQueueComponent = async () => {
    const documents = await getAllPatients()

    return (
        <PatientsComponent thePatients={documents} />
    )
}

export default PatientQueueComponent