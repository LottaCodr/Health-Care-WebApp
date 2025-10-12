"use client";

import { useState } from "react";

// shadcn/ui imports
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import supabase from "@/utils/supabase/client";

export default function StaffSignup() {
    const [email, setEmail] = useState("");
    const [name, setName] = useState("");
    const [role, setRole] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const roles = [
        "Doctor",
        "Nurse",
        "Pharmacist",
        "Labtech",
        "Frontdesk",
        "Admin",
    ];

    async function handleSignup(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            // Step 1: Create user in Supabase Auth
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        name,
                        role
                        // Don't include id or email - Supabase handles these
                    },
                },
            });

            if (authError) {
                console.error("Signup error:", authError.message);
                setError(authError.message);
                setLoading(false);
                return; // Stop execution if auth fails
            }

            // Check if user was created
            if (!authData.user) {
                setError("User creation failed. Please try again.");
                setLoading(false);
                return;
            }

            console.log("Signup success:", authData);
            console.log("User ID:", authData.user.id);

           console.log("Staff profile created successfully!");
            setSuccess("Account created successfully! You can login now.");

            // Optional: Clear form
            setEmail("");
            setName("");
            setRole("");
            setPassword("");

        } catch (err: any) {
            console.error("Unexpected error:", err);
            setError(err.message || "Signup failed. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#e63959]">
            <Card className="w-full max-w-md bg-white/10 backdrop-blur rounded-xl shadow-lg p-0 border-none">
                <CardHeader className="flex flex-col items-center gap-2 bg-transparent">
                    <img
                        src="/assets/icons/nilelogo.jpeg"
                        alt="Hospital Logo"
                        className="h-10 mx-auto mb-2"
                        style={{ filter: "brightness(0) invert(1)" }}
                    />
                    <CardTitle className="text-2xl font-bold text-white text-center">
                        Create Staff Account
                    </CardTitle>
                    <CardDescription className="text-white/80 text-sm text-center">
                        Enter your details to sign up
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form className="space-y-4" onSubmit={handleSignup}>
                        <div>
                            <Label htmlFor="name" className="text-white/90 text-sm mb-1">
                                Name
                            </Label>
                            <Input
                                id="name"
                                type="text"
                                required
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="Enter your name"
                                className="bg-white/80 text-gray-900"
                            />
                        </div>
                        <div>
                            <Label htmlFor="email" className="text-white/90 text-sm mb-1">
                                Email address
                            </Label>
                            <Input
                                id="email"
                                type="email"
                                required
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="Enter your email"
                                className="bg-white/80 text-gray-900"
                            />
                        </div>
                        <div>
                            <Label htmlFor="role" className="text-white/90 text-sm mb-1">
                                Role
                            </Label>
                            <Select
                                value={role}
                                onValueChange={setRole}
                                required
                            >
                                <SelectTrigger
                                    id="role"
                                    className="bg-white text-gray-900"
                                >
                                    <SelectValue placeholder="Select role" />
                                </SelectTrigger>
                                <SelectContent>
                                    {roles.map(dep => (
                                        <SelectItem key={dep} value={dep.toLowerCase()}>
                                            {dep}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="password" className="text-white/90 text-sm mb-1">
                                Password
                            </Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    required
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="Enter your password"
                                    className="pr-10 bg-white/80 text-gray-900"
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute inset-y-0 right-2 flex items-center text-gray-600"
                                    tabIndex={-1}
                                    onClick={() => setShowPassword((prev) => !prev)}
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                >
                                    {showPassword ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-5.523 0-10-4.477-10-10 0-1.657.336-3.236.938-4.675M15 12a3 3 0 11-6 0 3 3 0 016 0zm6.062-4.675A9.956 9.956 0 0122 9c0 5.523-4.477 10-10 10a9.956 9.956 0 01-4.675-.938" />
                                        </svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0zm2.828-2.828A9.956 9.956 0 0122 12c0 5.523-4.477 10-10 10S2 17.523 2 12c0-2.21.714-4.253 1.928-5.828M4.222 4.222l15.556 15.556" />
                                        </svg>
                                    )}
                                </Button>
                            </div>
                        </div>
                        {error && (
                            <Alert variant="destructive" className="text-red-200 bg-red-700/60 border-none">
                                <AlertDescription className="text-sm text-center">{error}</AlertDescription>
                            </Alert>
                        )}
                        {success && (
                            <Alert variant="default" className="text-green-200 bg-green-700/60 border-none">
                                <AlertDescription className="text-sm text-center">{success}</AlertDescription>
                            </Alert>
                        )}
                        <Button
                            type="submit"
                            className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-2 rounded transition disabled:opacity-60"
                            disabled={loading}
                        >
                            {loading ? "Signing up..." : "Sign Up"}
                        </Button>
                    </form>
                    <div className="mt-4 text-white/80 text-sm text-center">
                        Already have an account?{" "}
                        <a href="/staff" className="underline hover:text-white">
                            Log in
                        </a>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}