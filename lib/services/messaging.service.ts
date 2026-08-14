"use server";

import { createClient } from "@/utils/supabase/server";
import { UserRole } from "@/types/models";
import { requireStaff } from "./auth-guard";
import { logAction } from "./audit.service";

/**
 * Outbound messaging (SMS / email).
 *
 * Providers are selected with MESSAGING_PROVIDER:
 *   - "console" (default): logs the message server-side (dev/preview safe)
 *   - "termii":   Nigerian SMS gateway — TERMII_API_KEY, TERMII_SENDER_ID
 *   - "sendgrid": email — SENDGRID_API_KEY, MESSAGING_FROM_EMAIL
 *
 * All send paths are staff-only and audited.
 */

export interface SendResult {
    success: boolean;
    provider: string;
    detail?: string;
}

function provider(): string {
    return (process.env.MESSAGING_PROVIDER ?? "console").toLowerCase();
}

export async function sendSms(to: string, body: string): Promise<SendResult> {
    await requireStaff();
    const p = provider();

    try {
        if (p === "termii") {
            const apiKey = process.env.TERMII_API_KEY;
            if (!apiKey) return { success: false, provider: p, detail: "TERMII_API_KEY not configured" };
            const res = await fetch("https://api.ng.termii.com/api/sms/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    api_key: apiKey,
                    from: process.env.TERMII_SENDER_ID ?? "NileValley",
                    to: to.replace(/^\+?2340/, "+234").replace(/^0/, "+234"),
                    sms: body,
                    type: "plain",
                    channel: "generic",
                }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || (data as any).code === "ok" === false) {
                return { success: false, provider: p, detail: JSON.stringify(data).slice(0, 200) };
            }
            await logAction("SMS_SENT", "messaging", to, { provider: p });
            return { success: true, provider: p };
        }

        if (p === "console") {
            console.log(`[messaging][console][SMS → ${to}] ${body}`);
            return { success: true, provider: p, detail: "Logged to server console (dev provider)." };
        }

        return { success: false, provider: p, detail: `Unknown provider "${p}"` };
    } catch (error) {
        return { success: false, provider: p, detail: error instanceof Error ? error.message : "send failed" };
    }
}

export async function sendEmail(
    to: string,
    subject: string,
    body: string
): Promise<SendResult> {
    await requireStaff();
    const p = provider();

    try {
        if (p === "sendgrid") {
            const apiKey = process.env.SENDGRID_API_KEY;
            if (!apiKey) return { success: false, provider: p, detail: "SENDGRID_API_KEY not configured" };
            const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
                method: "POST",
                headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
                body: JSON.stringify({
                    personalizations: [{ to: [{ email: to }] }],
                    from: { email: process.env.MESSAGING_FROM_EMAIL ?? "no-reply@nilevalley.example" },
                    subject,
                    content: [{ type: "text/plain", value: body }],
                }),
            });
            if (!res.ok) {
                return { success: false, provider: p, detail: `HTTP ${res.status}` };
            }
            await logAction("EMAIL_SENT", "messaging", to, { subject });
            return { success: true, provider: p };
        }

        if (p === "console") {
            console.log(`[messaging][console][EMAIL → ${to}] ${subject}\n${body}`);
            return { success: true, provider: p, detail: "Logged to server console (dev provider)." };
        }

        return { success: false, provider: p, detail: `Unknown provider "${p}"` };
    } catch (error) {
        return { success: false, provider: p, detail: error instanceof Error ? error.message : "send failed" };
    }
}

/**
 * Send SMS appointment reminders for a given date to every patient with a
 * booked appointment that day. Front Desk / Admin only.
 */
export async function sendAppointmentReminders(dateISO: string): Promise<{
    attempted: number;
    sent: number;
    failed: number;
}> {
    await requireStaff([UserRole.FrontDesk]);
    const supabase = await createClient();
    const { data } = await supabase
        .from("appointments")
        .select("*, patients(name, phone)")
        .eq("appointment_date", dateISO)
        .eq("status", "scheduled");

    let attempted = 0;
    let sent = 0;
    let failed = 0;
    for (const appt of data ?? []) {
        const phone = appt?.patients?.phone ?? appt?.patient_phone_override;
        if (!phone) continue;
        attempted++;
        const time = appt.appointment_time ?? "";
        const result = await sendSms(
            phone,
            `Hello ${appt?.patients?.name ?? "patient"}, this is Nile Valley Hospital. Reminder: your appointment is on ${appt.appointment_date}${time ? ` at ${time}` : ""}. Call us if you cannot make it.`
        );
        if (result.success) sent++;
        else failed++;
    }

    await logAction("APPOINTMENT_REMINDERS_SENT", "appointments", dateISO, { attempted, sent, failed });
    return { attempted, sent, failed };
}
