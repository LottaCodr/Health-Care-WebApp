'use client';

import React from 'react';
import clsx from 'clsx';
import { useRouter } from 'next/navigation';
import { Patient, PatientStatus } from '@/context/patients/types';
import { Spinner } from '@/components/ui/spinner';
import { calculateAge, formatDate } from '@/lib/utils';
import { FaUserMd, FaHeartbeat, FaNotesMedical, FaPills, FaExclamationCircle } from 'react-icons/fa';
import { MdOutlineMedication, MdWarning } from 'react-icons/md';
import { useAuth } from '@/context/auth-provider';
import { motion, AnimatePresence } from 'framer-motion';

interface PatientsTableProps {
    patients: Patient[];
    isPending: boolean;
    currentPage: number;
}

const statusColorMap: Record<PatientStatus, string> = {
    'registered': 'bg-gray-400',
    'awaiting-consultation': 'bg-yellow-300',
    'under-consultation': 'bg-purple-500',
    'sent-to-nurse': 'bg-teal-500',
    'sent-to-lab': 'bg-indigo-500',
    'sent-to-pharmacy': 'bg-pink-500',
    'awaiting-payment': 'bg-orange-500',
    'admitted': 'bg-blue-600',
    'under-observation': 'bg-yellow-500',
    'discharged': 'bg-green-700',
    'no-status': 'bg-red-500',
};

const genderColorMap: Record<string, string> = {
    'male': 'text-blue-600',
    'female': 'text-pink-500',
    'other': 'text-purple-500',
};

function StatusBadge({ status }: { status: PatientStatus | string }) {
    const color = statusColorMap[status as PatientStatus] || 'bg-gray-500';
    return (
        <span
            className={clsx(
                'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold text-white shadow-sm transition',
                color
            )}
        >
            <FaExclamationCircle className="text-white/80 text-xs" />
            {typeof status === 'string'
                ? status.replace(/-/g, ' ').replace(/^\w/, (c: string) => c.toUpperCase())
                : 'No Status'}
        </span>
    );
}

// Animation variants
const containerVariants = {
    hidden: {},
    visible: {
        transition: {
            staggerChildren: 0.08,
        }
    },
};

const cardVariants = {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 80, damping: 18 } },
    exit: { opacity: 0, y: 24, transition: { duration: 0.16 } }
};

const loadingContainerVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: {
        opacity: 1,
        scale: 1,
        transition: {
            duration: 0.32,
            when: "beforeChildren",
            staggerChildren: 0.05
        }
    },
    exit: { opacity: 0, scale: 0.92, transition: { duration: 0.2 } }
};

const spinnerPulse = {
    animate: {
        scale: [1, 1.08, 0.98, 1],
        opacity: [0.7, 1, 0.8, 1],
        transition: {
            duration: 1.2,
            repeat: Infinity,
            ease: "easeInOut"
        }
    }
};

const PatientsTable: React.FC<PatientsTableProps> = ({ patients, isPending }) => {
    const router = useRouter();
    const { user } = useAuth();

    const handleClickOnPatient = (userId: string) => {
        if (user?.role === 'doctor') {
            router.push(`/doctor/patients/${userId}`);
        }
        if (user?.role === "nurse") {
            router.push(`/nurse/queue/patient/${userId}`);
        }
        if (user?.role === "labtech") {
            router.push(`/labtech/patients/${userId}`);
        }
        if (user?.role === 'pharmacist') {
            router.push(`/pharmacist/queue/patient/${userId}`);
        }
    };

    // Loading State Animation
    if (patients.length === 0 && isPending) {
        return (
            <AnimatePresence>
                <motion.div
                    className="w-full flex justify-center items-center min-h-[300px]"
                    variants={loadingContainerVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    key="loader"
                >
                    <motion.div className="flex flex-col gap-4 items-center">
                        <motion.div variants={spinnerPulse} animate="animate">
                            <Spinner size="lg" />
                        </motion.div>
                        <motion.span
                            className="text-lg text-blue-700 font-semibold"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0, transition: { delay: 0.2, duration: 0.44 } }}
                            exit={{ opacity: 0, y: 4, transition: { duration: 0.18 } }}
                        >
                            Getting your patients...
                        </motion.span>
                    </motion.div>
                </motion.div>
            </AnimatePresence>
        );
    }

    // Empty State Animation
    if (patients.length === 0 && !isPending) {
        return (
            <AnimatePresence>
                <motion.div
                    className="w-full flex justify-center items-center min-h-[300px]"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0, transition: { duration: 0.28 } }}
                    exit={{ opacity: 0, y: 8, transition: { duration: 0.17 } }}
                >
                    <div className="flex flex-col gap-2 items-center">
                        <MdWarning className="mx-auto text-3xl text-red-400 mb-2" />
                        <span className="block text-lg font-medium">No patients found.</span>
                    </div>
                </motion.div>
            </AnimatePresence>
        );
    }

    // The patient grid with entry/exit/transition animations
    return (
        <motion.div
            className={clsx(
                "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 py-2 w-full"
            )}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            <AnimatePresence>
                {patients.map((patient) => (
                    <motion.div
                        key={patient.id}
                        tabIndex={0}
                        role="button"
                        aria-label={`View details for patient ${patient.name}`}
                        onClick={() => handleClickOnPatient(patient?.id!)}
                        onKeyDown={e => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                handleClickOnPatient(patient?.id!);
                            }
                        }}
                        className={clsx(
                            "group relative flex flex-col rounded-2xl border border-border shadow-sm bg-white dark:bg-muted/60 px-6 py-5 cursor-pointer hover:shadow-lg outline-none transition ring-blue-400 focus:ring-2"
                        )}
                        style={{ minHeight: "182px" }}
                        variants={cardVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        layout
                        whileHover={{
                            scale: 1.02,
                            boxShadow: '0 6px 32px 5px rgba(60,72,175,0.08)'
                        }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <div className="flex items-center gap-4 w-full">
                            <div className="rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center h-12 w-12">
                                <FaUserMd className="text-blue-700 text-xl" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="font-semibold text-gray-900 dark:text-white truncate max-w-[140px]" title={patient?.name ?? 'N/A'}>
                                    {patient?.name ?? <span className="italic text-gray-400">N/A</span>}
                                </div>
                                <div className="flex gap-2 items-center mt-1">
                                    <span className={clsx(
                                        "flex items-center gap-1 font-medium text-xs",
                                        genderColorMap[(patient.gender || "").toLowerCase()] || 'text-gray-400'
                                    )}>
                                        <FaHeartbeat /> {patient.gender ?? <span className="italic text-gray-400">N/A</span>}
                                    </span>
                                    {patient?.birth_date && (
                                        <span className="text-gray-600 dark:text-gray-300 font-medium text-xs ml-2">
                                            {calculateAge(patient.birth_date)} yrs
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col gap-3 mt-6">
                            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-200 text-xs font-medium">
                                <FaNotesMedical className="text-green-600" />
                                <span>
                                    {patient?.created_at ? formatDate(patient.created_at) : <span className="italic text-gray-400">N/A</span>}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs font-medium">
                                <MdOutlineMedication className="text-purple-600" />
                                <span className="truncate max-w-[108px]" title={patient.longTermMedication ?? 'N/A'}>
                                    {patient.bloodGroup ?? <span className="italic text-gray-400">N/A</span>}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs font-medium">
                                <FaPills className="text-pink-500" />
                                <span className="truncate max-w-[108px]" title={patient.allergies ?? 'N/A'}>
                                    {patient.allergies ?? <span className="italic text-gray-400">N/A</span>}
                                </span>
                            </div>
                        </div>
                        <div className="absolute top-4 right-4">
                            <StatusBadge status={patient.status} />
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>
        </motion.div>
    );
};

export default PatientsTable;
