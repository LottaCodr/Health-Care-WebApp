
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";

const shimmerVariants = {
    animate: {
        backgroundPosition: ["-200% 0", "200% 0"],
        transition: {
            duration: 2,
            ease: "easeInOut",
            repeat: Infinity,
        },
    },
};

const AnimatedSkeleton = ({ className }: { className: string }) => (
    <motion.div
        variants={shimmerVariants}
        animate="animate"
        className={`${className} bg-[linear-gradient(90deg,_#f0f0f0_25%,_#e0e0e0_50%,_#f0f0f0_75%)] bg-[length:200%_100%] rounded-md`}
    />
);

export default function PatientDetailsSkeleton() {
    return (
        <main className="max-w-5xl mx-auto px-6 py-12 space-y-12">
            <Card className="shadow-xl rounded-3xl border border-border bg-background">
                <CardHeader className="pb-3 border-b">
                    <CardTitle className="text-3xl font-bold text-primary">
                        <AnimatedSkeleton className="h-8 w-48" />
                    </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-5 mt-6">
                    {Array.from({ length: 12 }).map((_, i) => (
                        <div key={i} className="space-y-2">
                            <AnimatedSkeleton className="h-4 w-32" />
                            <AnimatedSkeleton className="h-5 w-full" />
                        </div>
                    ))}
                </CardContent>
            </Card>

            <Card className="shadow-lg rounded-3xl border border-border bg-background">
                <CardHeader className="pb-3 border-b">
                    <CardTitle className="text-2xl font-semibold text-primary">
                        <AnimatedSkeleton className="h-6 w-40" />
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 mt-4">
                    <div className="space-y-2">
                        <AnimatedSkeleton className="h-4 w-24" />
                        <AnimatedSkeleton className="h-10 w-full md:w-1/2" />
                    </div>

                    <div className="space-y-2">
                        <AnimatedSkeleton className="h-4 w-32" />
                        <AnimatedSkeleton className="h-10 w-full md:w-1/2" />
                    </div>

                    <div className="space-y-2">
                        <AnimatedSkeleton className="h-4 w-56" />
                        <AnimatedSkeleton className="h-36 w-full" />
                    </div>

                    <AnimatedSkeleton className="h-10 w-full md:w-32" />
                </CardContent>
            </Card>
        </main>
    );
}
