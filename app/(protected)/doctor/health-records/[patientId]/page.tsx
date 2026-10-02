import PatientRecordPage from "@/components/doctor/health-record/PatientRecordPage";
import { lookupPatient } from "@/lib/services/patient.service";
import { notFound } from "next/navigation";
import Link from "next/link";

interface Props {
    params: Promise<{ patientId: string }>;
}

export default async function Page({ params }: Props) {
    const { patientId } = await params;          // ← await the params Promise
    const result = await lookupPatient(patientId);

    // A failed read is shown as a failed read, with its real reason. Throwing
    // here would reach the browser as the redacted "An error occurred in the
    // Server Components render…" placeholder, and calling notFound() would
    // claim the patient does not exist.
    if (!result.ok) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3 px-6 text-center" role="alert">
                <p className="text-gray-800 font-semibold">This record could not be opened</p>
                <p className="text-sm text-gray-500 max-w-md">
                    The system could not read the patient&rsquo;s record just now. The record has not been deleted.
                </p>
                <p className="text-xs text-gray-400 max-w-md break-words">{result.message}</p>
                <Link
                    href={`/doctor/health-records/${patientId}`}
                    className="inline-flex items-center h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold"
                >
                    Try again
                </Link>
            </div>
        );
    }

    if (!result.data) notFound();
    return <PatientRecordPage patient={result.data} />;
}
