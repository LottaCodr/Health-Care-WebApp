"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";

interface PasswordInputProps
    extends React.InputHTMLAttributes<HTMLInputElement> {
    name: string;
}

export function PasswordInput({ name, ...props }: PasswordInputProps) {
    const [show, setShow] = useState(false);

    return (
        <div className="relative">
            <Input
                {...props}
                type={show ? "text" : "password"}
                name={name}
                autoComplete="current-password"
                placeholder="••••••••"
                className="bg-white/20 border border-red-200/30 pr-12 text-white placeholder:text-primary/60 rounded-xl py-3 px-4 font-medium"
            />
            <button
                type="button"
                tabIndex={-1}
                onClick={() => setShow(!show)}
                aria-label={show ? "Hide password" : "Show password"}
                className="absolute inset-y-0 right-2 flex items-center px-2 text-red-200 hover:text-primary transition"
            >
                {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
        </div>
    );
}
