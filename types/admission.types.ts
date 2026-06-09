// ─── Admission domain types ───────────────────────────────────────────────────

export type AdmissionStatus  = "pending"  | "active" | "discharged";
export type AdmissionType    = "ward"     | "surgical" | "icu" | "maternity";
export type AdmissionUrgency = "routine"  | "urgent"  | "emergency";

export interface PatientAdmission {
    id:             string;
    patient_id:     string;
    admission_type: AdmissionType;
    urgency:        AdmissionUrgency;
    ward_name:      string | null;
    bed_number:     string | null;
    indication:     string | null;
    notes:          string | null;
    assigned_by:    string | null;
    admitted_at:    string;
    discharged_at:  string | null;
    status:         AdmissionStatus;
    created_at:     string;
    // Joined via Supabase select
    patients?:      { name: string; gender: string | null; birth_date: string | null; phone: string | null };
    staffs?:        { name: string } | null;
}

export interface CreateAdmissionInput {
    patient_id:     string;
    admission_type: AdmissionType;
    urgency:        AdmissionUrgency;
    ward_name?:     string;
    bed_number?:    string;
    indication?:    string;
    notes?:         string;
    assigned_by:    string;
}

export interface AssignWardInput {
    id:             string;
    ward_name:      string;
    bed_number?:    string;
    notes?:         string;
    assigned_by:    string;
}

export const ADMISSION_TYPE_CONFIG: Record<AdmissionType, { label: string; emoji: string; color: string; bg: string; border: string }> = {
    ward:      { label: "Ward Admission",    emoji: "🛏",  color: "text-blue-700",    bg: "bg-blue-50",    border: "border-blue-200"    },
    surgical:  { label: "Surgical",         emoji: "🔪", color: "text-red-700",     bg: "bg-red-50",     border: "border-red-200"     },
    icu:       { label: "ICU / HDU",        emoji: "🚨", color: "text-rose-700",    bg: "bg-rose-50",    border: "border-rose-200"    },
    maternity: { label: "Maternity",        emoji: "🤱", color: "text-pink-700",    bg: "bg-pink-50",    border: "border-pink-200"    },
};

export const URGENCY_CONFIG: Record<AdmissionUrgency, { label: string; color: string; bg: string; border: string; dot: string }> = {
    routine:   { label: "Routine",   color: "text-gray-600",  bg: "bg-gray-100",  border: "border-gray-200",  dot: "bg-gray-400"  },
    urgent:    { label: "Urgent",    color: "text-amber-700", bg: "bg-amber-50",  border: "border-amber-200", dot: "bg-amber-500" },
    emergency: { label: "Emergency", color: "text-red-700",   bg: "bg-red-50",    border: "border-red-200",   dot: "bg-red-500"   },
};