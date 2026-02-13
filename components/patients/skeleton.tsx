
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { FaUserMd, FaNotesMedical, FaHeartbeat, FaPills } from "react-icons/fa";
import { MdOutlineMedication } from "react-icons/md";

const shimmerVariants = {
  animate: {
    backgroundPosition: ["-200% 0", "200% 0"],
    transition: {
      duration: 1.2,
      ease: "linear",
      repeat: Infinity,
    },
  },
};

const AnimatedSkeleton = ({
  className = "",
  rounded = "rounded-md",
  style = {},
}: {
  className?: string;
  rounded?: string;
  style?: React.CSSProperties;
}) => (
  <motion.div
    variants={shimmerVariants}
    animate="animate"
    className={`${className} ${rounded} bg-[linear-gradient(90deg,_#f3f4f6_25%,_#e5e7eb_50%,_#f3f4f6_75%)] bg-[length:200%_100%]`}
    style={style}
    aria-busy="true"
    aria-label="Loading"
    tabIndex={-1}
  />
);

function SkeletonField({
  icon,
  labelWidth = "w-24",
  valueWidth = "w-40",
}: {
  icon?: React.ReactNode;
  labelWidth?: string;
  valueWidth?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      {icon && <span className="text-gray-400">{icon}</span>}
      <div className="flex-1 space-y-1">
        <AnimatedSkeleton className={`h-3 ${labelWidth}`} />
        <AnimatedSkeleton className={`h-5 ${valueWidth}`} />
      </div>
    </div>
  );
}

export default function PatientDetailsSkeleton() {
  return (
    <main className="max-w-5xl mx-auto px-4 py-10 space-y-10 animate-pulse">
      {/* Patient Info Card */}
      <Card className="shadow-xl rounded-3xl border border-border bg-background">
        <CardHeader className="pb-3 border-b flex flex-row items-center gap-4">
          <AnimatedSkeleton className="h-14 w-14" rounded="rounded-full" />
          <CardTitle className="text-3xl font-bold text-primary flex-1">
            <AnimatedSkeleton className="h-8 w-48" />
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-6 mt-6">
          <SkeletonField icon={<FaUserMd />} labelWidth="w-20" valueWidth="w-32" />
          <SkeletonField icon={<FaHeartbeat />} labelWidth="w-16" valueWidth="w-24" />
          <SkeletonField icon={<FaNotesMedical />} labelWidth="w-24" valueWidth="w-40" />
          <SkeletonField icon={<MdOutlineMedication />} labelWidth="w-28" valueWidth="w-36" />
          <SkeletonField icon={<FaPills />} labelWidth="w-20" valueWidth="w-32" />
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonField key={i} labelWidth="w-24" valueWidth="w-32" />
          ))}
        </CardContent>
      </Card>

      {/* Consultation History Card */}
      <Card className="shadow-lg rounded-3xl border border-border bg-background">
        <CardHeader className="pb-3 border-b flex flex-row items-center gap-4">
          <AnimatedSkeleton className="h-8 w-8" rounded="rounded-full" />
          <CardTitle className="text-2xl font-semibold text-primary flex-1">
            <AnimatedSkeleton className="h-6 w-40" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 mt-4">
          {/* Simulate a table of consultations */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-400">
                    <AnimatedSkeleton className="h-3 w-16" />
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-400">
                    <AnimatedSkeleton className="h-3 w-20" />
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-400">
                    <AnimatedSkeleton className="h-3 w-24" />
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-400">
                    <AnimatedSkeleton className="h-3 w-16" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="bg-white/70 dark:bg-muted/30">
                    <td className="px-3 py-3">
                      <AnimatedSkeleton className="h-4 w-16" />
                    </td>
                    <td className="px-3 py-3">
                      <AnimatedSkeleton className="h-4 w-20" />
                    </td>
                    <td className="px-3 py-3">
                      <AnimatedSkeleton className="h-4 w-24" />
                    </td>
                    <td className="px-3 py-3">
                      <AnimatedSkeleton className="h-4 w-16" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Simulate a button skeleton */}
          <div className="flex justify-end">
            <AnimatedSkeleton className="h-10 w-32" rounded="rounded-full" />
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
