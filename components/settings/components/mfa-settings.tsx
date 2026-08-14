"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { KeyRound, ShieldCheck, Trash2 } from "lucide-react";
import supabase from "@/utils/supabase/client";

/**
 * Two-factor authentication (TOTP authenticator apps).
 *
 * Uses Supabase Auth MFA (https://supabase.com/docs/guides/auth/auth-mfa).
 * Enrollment requires MFA to be ENABLED in Supabase Auth settings for the
 * project — until then this screen reports MFA as unavailable.
 */
export default function MfaSettings() {
    const [factors, setFactors] = useState<any[]>([]);
    const [available, setAvailable] = useState(true);
    const [enrolling, setEnrolling] = useState(false);
    const [factorId, setFactorId] = useState<string | null>(null);
    const [qrDataUri, setQrDataUri] = useState<string | null>(null);
    const [secret, setSecret] = useState<string | null>(null);
    const [code, setCode] = useState("");
    const [busy, setBusy] = useState(false);

    const refresh = useCallback(async () => {
        try {
            const { data, error } = await supabase.auth.mfa.listFactors();
            if (error) {
                if (String(error.message ?? "").toLowerCase().includes("not enabled")) setAvailable(false);
                return;
            }
            setFactors([...(data?.totp ?? []), ...(data?.phone ?? [])]);
        } catch {
            setAvailable(false);
        }
    }, []);

    useEffect(() => { refresh(); }, [refresh]);

    const startEnroll = async () => {
        setBusy(true);
        try {
            const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
            if (error) {
                toast.error(`Enrollment unavailable: ${error.message}`);
                setAvailable(false);
                return;
            }
            setEnrolling(true);
            setFactorId(data.id);
            setQrDataUri(data.totp?.qr_code ?? null);
            setSecret(data.totp?.secret ?? null);
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Enrollment failed.");
        } finally {
            setBusy(false);
        }
    };

    const verifyEnroll = async () => {
        if (!factorId || !code.trim()) return;
        setBusy(true);
        try {
            const challenge = await supabase.auth.mfa.challenge({ factorId });
            if (challenge.error) throw challenge.error;
            const verify = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.data.id, code: code.trim() });
            if (verify.error) throw verify.error;
            toast.success("Authenticator verified — 2FA is now active on this account.");
            setEnrolling(false); setCode(""); setQrDataUri(null); setSecret(null);
            refresh();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Verification failed.");
        } finally {
            setBusy(false);
        }
    };

    const unenroll = async (id: string) => {
        setBusy(true);
        try {
            const { error } = await supabase.auth.mfa.unenroll({ factorId: id });
            if (error) throw error;
            toast.success("Authenticator removed.");
            refresh();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Could not remove the authenticator.");
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2 text-xl font-semibold text-gray-800">
                <KeyRound className="h-5 w-5 text-indigo-500" />
                <span>Two-Factor Authentication</span>
            </div>

            {!available && (
                <p className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-800">
                    2FA is not enabled for this Supabase project yet. Turn on <b>MFA → TOTP</b> in the
                    Supabase Auth settings, then enroll here.
                </p>
            )}

            {factors.length === 0 && !enrolling && (
                <p className="mb-4 text-xs text-gray-500">
                    No authenticator apps linked. Add one (Google Authenticator, Authy, 1Password…) so a
                    second factor is required at login.
                </p>
            )}

            {factors.map((f) => (
                <div key={f.id} className="mb-3 flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                        <ShieldCheck size={16} className="text-green-600" />
                        Authenticator app
                        <Badge variant="secondary">{f.factor_type === "totp" ? "TOTP" : f.factor_type}</Badge>
                    </div>
                    <Button size="sm" variant="ghost" className="text-red-500" disabled={busy} onClick={() => unenroll(f.id)}>
                        <Trash2 size={14} /> Remove
                    </Button>
                </div>
            ))}

            {enrolling ? (
                <div className="space-y-4">
                    <p className="text-xs text-gray-500">Scan this QR code with your authenticator app:</p>
                    {qrDataUri ? (
                        
                        <img src={qrDataUri} alt="TOTP enrollment QR code" className="h-44 w-44 rounded-xl border border-gray-200" />
                    ) : (
                        secret && (
                            <p className="break-all rounded-xl bg-gray-900 px-4 py-3 font-mono text-xs text-green-300">
                                {secret}
                            </p>
                        )
                    )}
                    <div className="flex max-w-xs gap-2">
                        <Input placeholder="6-digit code from the app" value={code} maxLength={8}
                            onChange={(e) => setCode(e.target.value)} />
                        <Button onClick={verifyEnroll} disabled={busy || code.trim().length < 6}>Verify</Button>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => { setEnrolling(false); setFactorId(null); setQrDataUri(null); setSecret(null); }}>
                        Cancel
                    </Button>
                </div>
            ) : (
                <Button onClick={startEnroll} disabled={busy || !available} className="gap-2">
                    <ShieldCheck size={15} /> Enroll authenticator app
                </Button>
            )}
        </div>
    );
}
