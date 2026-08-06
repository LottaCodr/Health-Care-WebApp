"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Stethoscope, ShieldCheck, LogOut } from "lucide-react";

// ─── Status messages that cycle during logout ──────────────────────────────

const LOGOUT_STEPS = [
    { icon: ShieldCheck, text: "Securing your session...", accent: "text-blue-400" },
    { icon: LogOut, text: "Signing out of EMR...", accent: "text-amber-400" },
    { icon: Stethoscope, text: "Redirecting to login...", accent: "text-green-400" },
];

// ─── Component ──────────────────────────────────────────────────────────────

export function LogoutOverlay() {
    const [stepIndex, setStepIndex] = useState(0);

    useEffect(() => {
        // Cycle through status messages for visual feedback
        const interval = setInterval(() => {
            setStepIndex((prev) => {
                if (prev < LOGOUT_STEPS.length - 1) return prev + 1;
                return prev;
            });
        }, 800);

        return () => clearInterval(interval);
    }, []);

    const currentStep = LOGOUT_STEPS[stepIndex];
    const StepIcon = currentStep.icon;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#0a1628]"
        >
            {/* Background texture */}
            <div className="absolute inset-0 overflow-hidden">
                {/* Radial glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-blue-600/6 blur-3xl" />
                {/* Rings */}
                <div className="absolute bottom-[-100px] left-[-100px] w-[400px] h-[400px] rounded-full border border-white/[0.03]" />
                <div className="absolute top-[-80px] right-[-80px] w-[300px] h-[300px] rounded-full border border-white/[0.03]" />
                {/* Dot grid */}
                <div
                    className="absolute inset-0 opacity-[0.03]"
                    style={{
                        backgroundImage:
                            "radial-gradient(circle, #94a3b8 1px, transparent 1px)",
                        backgroundSize: "32px 32px",
                    }}
                />
            </div>

            {/* Content */}
            <div className="relative flex flex-col items-center gap-8">
                {/* Animated spinner */}
                <div className="relative w-20 h-20">
                    {/* Outer ring */}
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-0 rounded-3xl border-2 border-white/[0.06] border-t-blue-400"
                    />
                    {/* Middle ring */}
                    <motion.div
                        animate={{ rotate: -360 }}
                        transition={{ duration: 3.2, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-2 rounded-2xl border-2 border-white/[0.04] border-b-amber-400/50"
                    />
                    {/* Center icon */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={stepIndex}
                                initial={{ opacity: 0, scale: 0.6 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.6 }}
                                transition={{ duration: 0.2 }}
                            >
                                <StepIcon size={24} className={currentStep.accent} />
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>

                {/* Brand */}
                <div className="text-center space-y-2">
                    <motion.p
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                        className="text-white font-bold text-lg tracking-tight"
                    >
                        Nile Valley Hospital
                    </motion.p>
                    <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25 }}
                        className="text-white/20 text-[9px] font-black uppercase tracking-[0.25em]"
                    >
                        Mother & Child · Hospital EMR
                    </motion.p>
                </div>

                {/* Status text */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={stepIndex}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.25 }}
                        className="flex items-center gap-2.5"
                    >
                        <div className="flex gap-1">
                            {[0, 1, 2].map((i) => (
                                <motion.div
                                    key={i}
                                    animate={{
                                        opacity: i <= stepIndex ? 1 : 0.2,
                                        scale: i <= stepIndex ? 1 : 0.8,
                                    }}
                                    transition={{ duration: 0.3 }}
                                    className="w-1.5 h-1.5 rounded-full bg-blue-400"
                                />
                            ))}
                        </div>
                        <p className="text-white/50 text-xs font-medium">
                            {currentStep.text}
                        </p>
                    </motion.div>
                </AnimatePresence>

                {/* Progress bar */}
                <div className="w-48 h-0.5 bg-white/[0.06] rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: "0%" }}
                        animate={{ width: "100%" }}
                        transition={{ duration: 2.4, ease: "easeInOut" }}
                        className="h-full bg-gradient-to-r from-blue-400 via-blue-500 to-green-400 rounded-full"
                    />
                </div>
            </div>
        </motion.div>
    );
}
