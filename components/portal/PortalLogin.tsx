"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, HeartPulse, Loader2 } from "lucide-react";
import supabase from "@/utils/supabase/client";
import { getCurrentPortalPatient } from "@/lib/services/portal.service";

export default function PortalLogin() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [show, setShow] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const { data, error: signInError } = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password,
            });
            if (signInError || !data.user) {
                setError("Invalid email or password.");
                setLoading(false);
                return;
            }
            // Verify the account is actually linked to an enabled patient record.
            const patient = await getCurrentPortalPatient();
            if (!patient) {
                await supabase.auth.signOut();
                setError("This login is not linked to an enabled patient portal. Ask the hospital front desk.");
                setLoading(false);
                return;
            }
            router.replace("/portal/dashboard");
        } catch (err) {
            setError("Could not sign in. Check your connection and try again.");
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-sky-50 via-white to-emerald-50 px-4">
            <div className="w-full max-w-md rounded-3xl border border-gray-100 bg-white p-8 shadow-xl">
                <div className="mb-6 flex flex-col items-center text-center">
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100">
                        <HeartPulse className="h-6 w-6 text-emerald-600" />
                    </div>
                    <h1 className="text-xl font-black text-gray-900">Nile Valley Patient Portal</h1>
                    <p className="mt-1 text-xs text-gray-500">
                        View your appointments, lab results, prescriptions and bills.
                    </p>
                </div>

                <form onSubmit={submit} className="space-y-4">
                    <div>
                        <label className="mb-1 block text-xs font-bold text-gray-600">Email</label>
                        <Input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    </div>
                    <div>
                        <label className="mb-1 block text-xs font-bold text-gray-600">Password</label>
                        <div className="relative">
                            <Input type={show ? "text" : "password"} placeholder="••••••••" value={password}
                                onChange={(e) => setPassword(e.target.value)} required />
                            <button type="button" onClick={() => setShow((s) => !s)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                                {show ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>
                    {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{error}</p>}
                    <Button type="submit" disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700">
                        {loading && <Loader2 size={15} className="mr-2 animate-spin" />} Sign in
                    </Button>
                </form>
                <p className="mt-6 text-center text-[10px] text-gray-400">
                    Portal access is enabled by the hospital front desk. Contact reception if you cannot sign in.
                </p>
            </div>
        </div>
    );
}
