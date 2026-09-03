"use server";

import { createClient } from "@/utils/supabase/server";
import { requireStaff } from "./auth-guard";
import {
    CareTeamMember,
    PatientCareTeamSummary,
    getStaffInitials,
    normalizeRoleKey,
} from "@/types/care-team";
import { UserRole } from "@/types/models";

interface RawStaffRow {
    id: string;
    name: string;
    role: string;
    department?: string | null;
    email?: string | null;
    phone_number?: string | null;
}

/**
 * Aggregates all multidisciplinary staff members who attended to a patient across:
 * - Doctor Consultations
 * - Nursing Triage & Care Actions
 * - Laboratory Sample Collection & Result Verifications
 * - Radiology Scans & Reports
 * - Pharmacy Prescriptions & Dispensing
 * - Front Desk & Billing Payments
 * - Surgical Procedures & Ward Admissions
 */
export async function getPatientCareTeam(patientId: string): Promise<PatientCareTeamSummary> {
    if (!patientId) {
        return {
            patientId: "",
            primaryDoctor: null,
            primaryNurse: null,
            lastAttendant: null,
            members: [],
            totalCount: 0,
        };
    }

    await requireStaff();
    const supabase = await createClient();

    // ── 1. Parallel queries across clinical tables ──────────────────────────────
    const [
        consultationsRes,
        nursingRes,
        labRes,
        prescriptionsRes,
        paymentsRes,
        surgeriesRes,
    ] = await Promise.all([
        supabase
            .from("consultations")
            .select("id, doctor_id, consultation_date, created_at, diagnosis, symptoms, status")
            .eq("patient_id", patientId)
            .order("created_at", { ascending: false })
            .limit(10),

        supabase
            .from("nursing_actions")
            .select("id, assigned_nurse, completed_by, action_type, description, status, completion_time, created_at")
            .eq("patient_id", patientId)
            .order("created_at", { ascending: false })
            .limit(10),

        supabase
            .from("lab_requests")
            .select("id, requested_by, completed_by, test_type, status, completed_at, created_at")
            .or(`visit_id.eq.${patientId},patient_id.eq.${patientId}`)
            .order("created_at", { ascending: false })
            .limit(10),

        supabase
            .from("prescriptions")
            .select("id, pharmacist_id, nurse_id, drug_name, status, dispensed, dispensed_at, created_at")
            .eq("patient_id", patientId)
            .order("created_at", { ascending: false })
            .limit(10),

        supabase
            .from("payments")
            .select("id, processed_by, category, description, status, paid_at, created_at")
            .eq("patient_id", patientId)
            .order("created_at", { ascending: false })
            .limit(5),

        supabase
            .from("surgeries")
            .select("id, surgeon_id, anaesthetist_id, procedure_name, status, scheduled_at, completed_at, created_at")
            .eq("patient_id", patientId)
            .order("created_at", { ascending: false })
            .limit(5),
    ]);

    const consultations = consultationsRes.data ?? [];
    const nursingActions = nursingRes.data ?? [];
    const labRequests = labRes.data ?? [];
    const prescriptions = prescriptionsRes.data ?? [];
    const payments = paymentsRes.data ?? [];
    const surgeries = surgeriesRes.data ?? [];

    // ── 2. Collect all unique referenced staff IDs ──────────────────────────────
    const staffIdSet = new Set<string>();

    consultations.forEach((c) => {
        if (c.doctor_id) staffIdSet.add(c.doctor_id);
    });
    nursingActions.forEach((n) => {
        if (n.completed_by) staffIdSet.add(n.completed_by);
        if (n.assigned_nurse) staffIdSet.add(n.assigned_nurse);
    });
    labRequests.forEach((l) => {
        if (l.completed_by) staffIdSet.add(l.completed_by);
        if (l.requested_by) staffIdSet.add(l.requested_by);
    });
    prescriptions.forEach((p) => {
        if (p.pharmacist_id) staffIdSet.add(p.pharmacist_id);
        if (p.nurse_id) staffIdSet.add(p.nurse_id);
    });
    payments.forEach((py) => {
        if (py.processed_by) staffIdSet.add(py.processed_by);
    });
    surgeries.forEach((s) => {
        if (s.surgeon_id) staffIdSet.add(s.surgeon_id);
        if (s.anaesthetist_id) staffIdSet.add(s.anaesthetist_id);
    });

    const staffIds = Array.from(staffIdSet).filter(
        (id) => Boolean(id) && typeof id === "string" && id !== "system" && id !== "unassigned"
    );

    // ── 3. Batch lookup staff profiles ──────────────────────────────────────────
    const staffMap = new Map<string, RawStaffRow>();

    if (staffIds.length > 0) {
        const { data: staffRows, error: staffErr } = await supabase
            .from("staffs")
            .select("id, name, role, department, email, phone_number")
            .in("id", staffIds);

        if (!staffErr && staffRows) {
            staffRows.forEach((s: any) => {
                staffMap.set(s.id, s);
            });
        }
    }

    // Helper to resolve staff profile
    const getStaff = (id?: string | null, fallbackRole: string = "Staff"): RawStaffRow => {
        if (id && staffMap.has(id)) {
            return staffMap.get(id)!;
        }
        // Graceful fallback for demo or unlinked IDs — never expose staff IDs.
        return {
            id: id || "unknown",
            name: id ? "Unassigned staff" : "Care Attendant",
            role: fallbackRole,
            department: fallbackRole,
        };
    };

    // ── 4. Synthesize raw attendance events ─────────────────────────────────────
    interface AttendanceEvent {
        staff: RawStaffRow;
        member: CareTeamMember;
        timestamp: string;
        priorityRank: number; // 1 = Doctor, 2 = Nurse, 3 = Lab/Rad, 4 = Pharm, 5 = Admin
    }

    const events: AttendanceEvent[] = [];

    // A. Consultations
    consultations.forEach((c) => {
        if (!c.doctor_id) return;
        const staff = getStaff(c.doctor_id, "Doctor");
        const ts = c.created_at || c.consultation_date || new Date().toISOString();
        const details = c.diagnosis ? `Diagnosis: ${c.diagnosis}` : c.symptoms ? `Assessment: ${c.symptoms.slice(0, 80)}` : "Clinical consultation";
        events.push({
            staff,
            timestamp: ts,
            priorityRank: 1,
            member: {
                staffId: staff.id,
                name: staff.name,
                role: staff.role || UserRole.Doctor,
                department: staff.department || "Internal Medicine",
                initials: getStaffInitials(staff.name),
                phone: staff.phone_number ?? undefined,
                email: staff.email ?? undefined,
                isPrimary: true,
                activity: {
                    type: "consultation",
                    label: "Clinical Consultation",
                    details,
                    timestamp: ts,
                },
            },
        });
    });

    // B. Nursing Actions
    nursingActions.forEach((n) => {
        const nurseId = n.completed_by || n.assigned_nurse;
        if (!nurseId) return;
        const staff = getStaff(nurseId, "Nurse");
        const ts = n.completion_time || n.created_at || new Date().toISOString();
        const isVitals = (n.action_type || "").toLowerCase().includes("vital") || (n.action_type || "").toLowerCase().includes("triage");
        events.push({
            staff,
            timestamp: ts,
            priorityRank: 2,
            member: {
                staffId: staff.id,
                name: staff.name,
                role: staff.role || UserRole.Nurse,
                department: staff.department || "Nursing Services",
                initials: getStaffInitials(staff.name),
                phone: staff.phone_number ?? undefined,
                email: staff.email ?? undefined,
                activity: {
                    type: isVitals ? "triage_vitals" : "nursing_care",
                    label: n.action_type || "Nursing Care",
                    details: n.description || undefined,
                    timestamp: ts,
                },
            },
        });
    });

    // C. Lab Requests
    labRequests.forEach((l) => {
        const staffId = l.completed_by || l.requested_by;
        if (!staffId) return;
        const isRad = (l.test_type || "").startsWith("[RADIOLOGY]");
        const staff = getStaff(staffId, isRad ? "Radiologist" : "LabTechnician");
        const ts = l.completed_at || l.created_at || new Date().toISOString();
        events.push({
            staff,
            timestamp: ts,
            priorityRank: 3,
            member: {
                staffId: staff.id,
                name: staff.name,
                role: staff.role || (isRad ? UserRole.Radiologist : UserRole.LabTechnician),
                department: staff.department || (isRad ? "Radiology & Imaging" : "Laboratory Medicine"),
                initials: getStaffInitials(staff.name),
                phone: staff.phone_number ?? undefined,
                email: staff.email ?? undefined,
                activity: {
                    type: isRad ? "radiology_scan" : l.completed_by ? "lab_verification" : "lab_request",
                    label: isRad ? `Radiology: ${l.test_type.replace(/^\[RADIOLOGY\]\s*/i, "")}` : `Lab: ${l.test_type}`,
                    details: l.status === "completed" ? "Result Verified & Signed" : "Investigation Requested",
                    timestamp: ts,
                },
            },
        });
    });

    // D. Prescriptions
    prescriptions.forEach((p) => {
        const staffId = p.pharmacist_id || p.nurse_id;
        if (!staffId) return;
        const staff = getStaff(staffId, "Pharmacist");
        const ts = p.dispensed_at || p.created_at || new Date().toISOString();
        events.push({
            staff,
            timestamp: ts,
            priorityRank: 4,
            member: {
                staffId: staff.id,
                name: staff.name,
                role: staff.role || UserRole.Pharmacist,
                department: staff.department || "Pharmacy Services",
                initials: getStaffInitials(staff.name),
                phone: staff.phone_number ?? undefined,
                email: staff.email ?? undefined,
                activity: {
                    type: "pharmacy_dispense",
                    label: `Dispensed ${p.drug_name}`,
                    details: p.dispensed ? "Medication Dispensed & Counselled" : "Prescription Active",
                    timestamp: ts,
                },
            },
        });
    });

    // E. Surgeries
    surgeries.forEach((s) => {
        if (s.surgeon_id) {
            const staff = getStaff(s.surgeon_id, "Surgeon");
            const ts = s.completed_at || s.scheduled_at || s.created_at || new Date().toISOString();
            events.push({
                staff,
                timestamp: ts,
                priorityRank: 1,
                member: {
                    staffId: staff.id,
                    name: staff.name,
                    role: "Surgeon",
                    department: staff.department || "Surgical Services",
                    initials: getStaffInitials(staff.name),
                    phone: staff.phone_number ?? undefined,
                    email: staff.email ?? undefined,
                    activity: {
                        type: "surgery",
                        label: `Procedure: ${s.procedure_name}`,
                        details: `Status: ${s.status}`,
                        timestamp: ts,
                    },
                },
            });
        }
    });

    // F. Payments / Registration
    payments.forEach((py) => {
        if (!py.processed_by) return;
        const staff = getStaff(py.processed_by, "FrontDesk");
        const ts = py.paid_at || py.created_at || new Date().toISOString();
        events.push({
            staff,
            timestamp: ts,
            priorityRank: 5,
            member: {
                staffId: staff.id,
                name: staff.name,
                role: staff.role || UserRole.FrontDesk,
                department: staff.department || "Front Desk & Billing",
                initials: getStaffInitials(staff.name),
                phone: staff.phone_number ?? undefined,
                email: staff.email ?? undefined,
                activity: {
                    type: "billing_settlement",
                    label: `Payment: ${py.description || py.category || "Billing"}`,
                    details: `Status: ${py.status}`,
                    timestamp: ts,
                },
            },
        });
    });

    // ── 5. Deduplicate and build CareTeam summary ───────────────────────────────
    // Sort events by timestamp descending (most recent first)
    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const membersMap = new Map<string, CareTeamMember>();
    let primaryDoctor: CareTeamMember | null = null;
    let primaryNurse: CareTeamMember | null = null;
    let lastAttendant: CareTeamMember | null = null;

    if (events.length > 0) {
        lastAttendant = events[0].member;
    }

    events.forEach((ev) => {
        const key = ev.staff.id;
        const roleKey = normalizeRoleKey(ev.member.role);

        // Track primary roles
        if (!primaryDoctor && (roleKey === "doctor" || roleKey === "surgeon")) {
            primaryDoctor = ev.member;
        }
        if (!primaryNurse && roleKey === "nurse") {
            primaryNurse = ev.member;
        }

        // Keep the most recent activity per member
        if (!membersMap.has(key)) {
            membersMap.set(key, ev.member);
        }
    });

    const membersList = Array.from(membersMap.values());

    return {
        patientId,
        primaryDoctor,
        primaryNurse,
        lastAttendant,
        members: membersList,
        totalCount: membersList.length,
    };
}

/**
 * Optimized batch lookup for patient tables / queues.
 * Returns a map of patientId -> lastAttendant / primaryDoctor.
 */
export async function getBatchPatientsCareTeam(
    patientIds: string[]
): Promise<Record<string, { lastAttendant: CareTeamMember | null; primaryDoctor: CareTeamMember | null; primaryNurse: CareTeamMember | null; count: number }>> {
    if (!patientIds || patientIds.length === 0) return {};

    await requireStaff();
    const supabase = await createClient();

    // Query recent consultations and nursing actions for these patients
    const [consultRes, nursingRes] = await Promise.all([
        supabase
            .from("consultations")
            .select("patient_id, doctor_id, created_at, consultation_date, diagnosis")
            .in("patient_id", patientIds)
            .order("created_at", { ascending: false }),

        supabase
            .from("nursing_actions")
            .select("patient_id, assigned_nurse, completed_by, action_type, created_at, completion_time")
            .in("patient_id", patientIds)
            .order("created_at", { ascending: false }),
    ]);

    const consultations = consultRes.data ?? [];
    const nursingActions = nursingRes.data ?? [];

    const staffIdSet = new Set<string>();
    consultations.forEach((c) => c.doctor_id && staffIdSet.add(c.doctor_id));
    nursingActions.forEach((n) => {
        if (n.completed_by) staffIdSet.add(n.completed_by);
        if (n.assigned_nurse) staffIdSet.add(n.assigned_nurse);
    });

    const staffIds = Array.from(staffIdSet).filter(Boolean);
    const staffMap = new Map<string, RawStaffRow>();

    if (staffIds.length > 0) {
        const { data: staffRows } = await supabase
            .from("staffs")
            .select("id, name, role, department")
            .in("id", staffIds);

        if (staffRows) {
            staffRows.forEach((s: any) => staffMap.set(s.id, s));
        }
    }

    const result: Record<
        string,
        { lastAttendant: CareTeamMember | null; primaryDoctor: CareTeamMember | null; primaryNurse: CareTeamMember | null; count: number }
    > = {};

    patientIds.forEach((pid) => {
        const patientConsults = consultations.filter((c) => c.patient_id === pid);
        const patientNursing = nursingActions.filter((n) => n.patient_id === pid);

        let primaryDoc: CareTeamMember | null = null;
        let primaryNur: CareTeamMember | null = null;

        if (patientConsults.length > 0 && patientConsults[0].doctor_id) {
            const staff = staffMap.get(patientConsults[0].doctor_id) ?? {
                id: patientConsults[0].doctor_id,
                name: "Attending Physician",
                role: "Doctor",
                department: "Internal Medicine",
            };
            primaryDoc = {
                staffId: staff.id,
                name: staff.name,
                role: staff.role,
                department: staff.department ?? "Internal Medicine",
                initials: getStaffInitials(staff.name),
                isPrimary: true,
                activity: {
                    type: "consultation",
                    label: "Consultation",
                    timestamp: patientConsults[0].created_at || new Date().toISOString(),
                },
            };
        }

        if (patientNursing.length > 0) {
            const nurseId = patientNursing[0].completed_by || patientNursing[0].assigned_nurse;
            if (nurseId) {
                const staff = staffMap.get(nurseId) ?? {
                    id: nurseId,
                    name: "Assigned Nurse",
                    role: "Nurse",
                    department: "Nursing Services",
                };
                primaryNur = {
                    staffId: staff.id,
                    name: staff.name,
                    role: staff.role,
                    department: staff.department ?? "Nursing Services",
                    initials: getStaffInitials(staff.name),
                    activity: {
                        type: "nursing_care",
                        label: patientNursing[0].action_type || "Nursing Care",
                        timestamp: patientNursing[0].completion_time || patientNursing[0].created_at || new Date().toISOString(),
                    },
                };
            }
        }

        const lastAttendant = primaryDoc || primaryNur || null;
        const total = (primaryDoc ? 1 : 0) + (primaryNur ? 1 : 0);

        result[pid] = {
            lastAttendant,
            primaryDoctor: primaryDoc,
            primaryNurse: primaryNur,
            count: total,
        };
    });

    return result;
}
