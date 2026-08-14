"use server";

import { createClient } from "@/utils/supabase/server";
import { UserRole } from "@/types/models";
import { requireStaff } from "./auth-guard";
import { logAction } from "./audit.service";

// ═══════════════════════════════ PATIENT PORTAL ═══════════════════════════════
// Patients authenticate with Supabase Auth (their own login) and are resolved
// via patients.portal_user_id. All reads are scoped to their own records.

export async function getCurrentPortalPatient(): Promise<any | null> {
    const supabase = await createClient();
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user?.id;
    if (!userId) return null;
    const { data } = await supabase
        .from("patients")
        .select("*")
        .eq("portal_user_id", userId)
        .eq("portal_enabled", true)
        .maybeSingle();
    return data ?? null;
}

export interface PortalDashboard {
    patient: any;
    appointments: any[];
    labResults: any[];
    prescriptions: any[];
    bills: any[];
    allergies: any[];
    immunizations: any[];
    documents: any[];
}

export async function getPortalDashboard(): Promise<PortalDashboard | null> {
    const patient = await getCurrentPortalPatient();
    if (!patient) return null;
    const supabase = await createClient();

    const [appointments, labResults, prescriptions, bills, allergies, immunizations, documents] =
        await Promise.all([
            supabase.from("appointments").select("*").eq("patient_id", patient.id).order("appointment_date", { ascending: false }).limit(20),
            supabase.from("lab_requests").select("*").eq("visit_id", patient.id).order("created_at", { ascending: false }).limit(20),
            supabase.from("prescriptions").select("*").eq("patient_id", patient.id).order("created_at", { ascending: false }).limit(20),
            supabase.from("payments").select("*").eq("patient_id", patient.id).order("created_at", { ascending: false }).limit(20),
            supabase.from("patient_allergies").select("*").eq("patient_id", patient.id).eq("status", "active"),
            supabase.from("immunizations").select("*").eq("patient_id", patient.id).order("administered_date", { ascending: false }),
            supabase.from("patient_documents").select("*").eq("patient_id", patient.id).order("created_at", { ascending: false }).limit(20),
        ]);

    return {
        patient,
        appointments: appointments.data ?? [],
        labResults: labResults.data ?? [],
        prescriptions: prescriptions.data ?? [],
        bills: bills.data ?? [],
        allergies: allergies.data ?? [],
        immunizations: immunizations.data ?? [],
        documents: documents.data ?? [],
    };
}

export interface EnablePortalInput {
    patientId: string;
    email: string;
    temporaryPassword: string;
}

export interface EnablePortalResult {
    success: boolean;
    message: string;
    portalUserId?: string;
}

/**
 * Front Desk enables a patient's portal access: creates a Supabase Auth user
 * and links it via patients.portal_user_id. Requires the service-role key
 * (admin client) for user creation.
 */
export async function enablePatientPortal(input: EnablePortalInput): Promise<EnablePortalResult> {
    await requireStaff([UserRole.FrontDesk]);

    if (!input.email?.trim() || !input.temporaryPassword || input.temporaryPassword.length < 8) {
        return { success: false, message: "A valid email and a temporary password (8+ characters) are required." };
    }

    const supabase = await createClient();
    const { data: patient } = await supabase
        .from("patients")
        .select("id, name, portal_user_id, portal_enabled")
        .eq("id", input.patientId)
        .single();
    if (!patient) return { success: false, message: "Patient not found." };
    if (patient.portal_user_id && patient.portal_enabled) {
        return { success: false, message: "Portal access is already enabled for this patient." };
    }

    const { createAdminClient } = await import("@/utils/supabase/admin");
    const admin = createAdminClient();
    if (!admin) {
        return {
            success: false,
            message:
                "Portal accounts require SUPABASE_SERVICE_ROLE_KEY on the server. Configure it and retry.",
        };
    }

    // Reuse the existing linked auth user if one exists, otherwise create it.
    let portalUserId: string | null = patient.portal_user_id ?? null;
    if (!portalUserId) {
        const { data: created, error: createError } = await admin.auth.admin.createUser({
            email: input.email.trim(),
            password: input.temporaryPassword,
            email_confirm: true,
            user_metadata: { kind: "patient", patient_name: patient.name },
        });
        if (createError || !created.user) {
            return {
                success: false,
                message: `Could not create the portal login: ${createError?.message ?? "unknown error"}`,
            };
        }
        portalUserId = created.user.id;
    } else {
        // Reset the password on the existing linked account.
        await admin.auth.admin.updateUserById(portalUserId, { password: input.temporaryPassword });
    }

    const { error: linkError } = await supabase
        .from("patients")
        .update({ portal_user_id: portalUserId, portal_enabled: true })
        .eq("id", input.patientId);
    if (linkError) {
        return { success: false, message: `Could not link the portal account: ${linkError.message}` };
    }

    await logAction("PORTAL_ENABLED", "patients", input.patientId, {
        portal_user_id: portalUserId,
    });

    return {
        success: true,
        message: "Portal access enabled. Share the email and temporary password with the patient.",
        portalUserId,
    };
}

export async function disablePatientPortal(patientId: string): Promise<EnablePortalResult> {
    await requireStaff([UserRole.FrontDesk]);
    const supabase = await createClient();
    const { error } = await supabase
        .from("patients")
        .update({ portal_enabled: false })
        .eq("id", patientId);
    if (error) return { success: false, message: error.message };
    await logAction("PORTAL_DISABLED", "patients", patientId, {});
    return { success: true, message: "Portal access disabled." };
}
