"use client";

import React from "react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getAdmissionsByPatient } from "@/lib/services/admission.service";
import { BedDouble, Loader2 } from "lucide-react";
import Link from "next/link";

// Derive patient type from the shape returned by admissions query
type Patient = {
  name?: string | null;
  gender?: string | null;
  birth_date?: string | null;
  phone?: string | null;
};

type PatientAdmission = {
  id: string;
  patient_id: string;
  admission_type?: string | null;
  urgency?: string | null;
  ward_name?: string | null;
  bed_number?: string | null;
  status: string;
  admitted_at?: string | null;
  indication?: string | null;
  notes?: string | null;
  patients?: Patient | null;
  staffs?: { name?: string | null } | null;
};

function fmtTime(iso?: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getPatientAge(birth_date?: string | null) {
  if (!birth_date) return null;
  const age = new Date().getFullYear() - new Date(birth_date).getFullYear();
  return age < 1 ? "< 1 yr" : `${age} yrs`;
}

export default function AdmissionDetailPage() {
  const params = useParams();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const [admissions, setAdmissions] = useState<PatientAdmission[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);

    getAdmissionsByPatient(id as string)
      .then((data) => {
        setAdmissions(data ?? []);
      })
      .catch(() => setAdmissions([]))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center pt-20">
        <Loader2 className="animate-spin text-blue-400" size={30} />
        <div className="mt-2 text-gray-400">Loading Admission Details...</div>
      </div>
    );
  }

  if (!admissions || admissions.length === 0) {
    return (
      <div className="max-w-xl mx-auto mt-20 bg-white border rounded-xl shadow-sm p-8 flex flex-col items-center text-center">
        <BedDouble className="mb-4 text-gray-300" size={36} />
        <h2 className="text-lg font-bold text-gray-800">No Admissions Found</h2>
        <p className="text-gray-500 mt-2 mb-6">
          No admission records for this patient.
        </p>
        <Link
          href="/front-desk/admissions"
          className="text-blue-600 hover:underline font-medium"
        >
          Back to Admissions Queue
        </Link>
      </div>
    );
  }

  const admission = admissions[0];
  const patient = admission.patients || {};

  return (
    <div className="max-w-2xl mx-auto mt-12 bg-white border rounded-3xl shadow-md p-8">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center">
          <BedDouble className="text-indigo-500" size={26} />
        </div>
        <div className="flex-1">
          <h1 className="text-lg font-extrabold text-gray-900 leading-tight">
            Admission Details
          </h1>
          <p className="text-xs text-gray-400">{admission.status === "active" ? "Active Admission" : "Admission"}</p>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <h2 className="font-semibold text-gray-700 text-sm mb-1">Patient Information</h2>
          <div className="bg-gray-50 p-4 rounded-xl border">
            <p className="font-bold text-gray-900">{patient?.name ?? "—"}</p>
            <p className="text-gray-500 text-sm">
              {patient?.gender ?? "—"}
              {patient?.birth_date ? (
                <>
                  {' '}· Age: {getPatientAge(patient.birth_date)}
                </>
              ) : null}
              {patient?.phone ? <> · {patient.phone}</> : null}
            </p>
          </div>
        </div>

        <div>
          <h2 className="font-semibold text-gray-700 text-sm mb-1">Admission Record</h2>
          <div className="bg-gray-50 p-4 rounded-xl border">
            <div className="flex flex-col gap-2 text-sm">
              <div>
                <span className="font-semibold">Admitted at:</span>{" "}
                {fmtTime(admission.admitted_at) || "—"}
              </div>
              
              <div>
                <span className="font-semibold">Ward:</span>{" "}
                {(admission.ward_name ? admission.ward_name : <span className="text-gray-400">Not assigned</span>)}
              </div>
              <div>
                <span className="font-semibold">Bed:</span>{" "}
                {(admission.bed_number ? admission.bed_number : <span className="text-gray-400">Not assigned</span>)}
              </div>
              <div>
                <span className="font-semibold">Type:</span>{" "}
                {admission.admission_type ?? "—"}
              </div>
              <div>
                <span className="font-semibold">Urgency:</span>{" "}
                {admission.urgency ?? "—"}
              </div>
              <div>
                <span className="font-semibold">Indication:</span>{" "}
                {admission.indication ?? "—"}
              </div>
              <div>
                <span className="font-semibold">Notes:</span>{" "}
                {admission.notes ?? "—"}
              </div>
              <div>
                <span className="font-semibold">Assigned by:</span>{" "}
                {admission.staffs?.name ?? "—"}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-8 flex justify-end">
        <Link
          href="/front-desk/admissions"
          className="inline-flex items-center px-4 py-2 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-xl font-semibold hover:bg-indigo-100 transition-all text-sm"
        >
          Back to Admissions
        </Link>
      </div>
    </div>
  );
}