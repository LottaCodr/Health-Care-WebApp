import { getPatient } from "@/actions/patients/get.patients";
import PatientDetailsComponent from "@/components/doctor/patients/patient-detail";


type ParamsProps = {
    params: {
        patientId: string;
    };
};

export default async function PatientDetailsPage({ params }: ParamsProps) {
    const patient = await getPatient(params.patientId);

    if (!patient) {
        return <div>Patient not found.</div>;
    }

    return <PatientDetailsComponent patient={patient} />;
}
