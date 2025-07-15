'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import ViewDoctorInstructions from './view-doctor-instructions';
import RecordVitalsForm from './record-vitals-form';
import { NursingAction } from '@/actions/nursing-action/types';
import { FiEye, FiHeart } from 'react-icons/fi';

interface Props {
    tasks: NursingAction[];
}

export default function NurseTaskTable({ tasks }: Props) {
    const router = useRouter();
    const [selectedTask, setSelectedTask] = useState<NursingAction | null>(null);
    const [viewingInstructions, setViewingInstructions] = useState(false);
    const [recordingVitals, setRecordingVitals] = useState(false);

    if (tasks.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-10">
                <svg
                    className="w-16 h-16 text-red-400 mb-4 animate-bounce"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                </svg>
                <div className="text-lg font-semibold text-red-500 mb-1">
                    No assigned patients
                </div>
                <div className="text-muted-foreground">
                    You have no assigned patients at the moment.
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 max-w-4xl mx-auto">
            <div className="mb-6 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-red-600 flex items-center gap-2">
                    <span className="inline-block w-2 h-6 bg-red-500 rounded-full mr-2" />
                    Patient Tasks
                </h2>
                <span className="text-sm text-muted-foreground">
                    {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
                </span>
            </div>
            <div className="overflow-x-auto rounded-lg shadow-lg border border-red-200 bg-white">
                <table className="min-w-full divide-y divide-red-200 text-sm">
                    <thead className="bg-red-50">
                        <tr>
                            <th className="px-6 py-4 text-left font-semibold text-red-700 tracking-wide">
                                Patient Name
                            </th>
                            <th className="px-6 py-4 text-left font-semibold text-red-700 tracking-wide">
                                Status
                            </th>
                            <th className="px-6 py-4 text-left font-semibold text-red-700 tracking-wide">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <AnimatePresence>
                        <tbody className="divide-y divide-red-100">
                            {tasks.map((task, idx) => (
                                <motion.tr
                                    key={task.$id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.25, delay: idx * 0.04 }}
                                    className="hover:bg-red-50 transition-colors"
                                >
                                    <td className="px-6 py-4 font-medium text-gray-900">
                                        {task?.patient?.name || (
                                            <span className="italic text-gray-400">Unknown</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 capitalize">
                                        <span className="inline-flex items-center gap-2 px-2 py-1 rounded-full bg-red-100 text-red-700 font-semibold text-xs">
                                            {task.taskDate}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 flex gap-2">
                                        <Button
                                            size="sm"
                                            className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-1 shadow"
                                            onClick={() => {
                                                setSelectedTask(task);
                                                setViewingInstructions(true);
                                            }}
                                        >
                                            <FiEye className="w-4 h-4" />
                                            View Instructions
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="border-red-500 text-red-600 hover:bg-red-50 flex items-center gap-1"
                                            onClick={() => {
                                                setSelectedTask(task);
                                                setRecordingVitals(true);
                                            }}
                                        >
                                            <FiHeart className="w-4 h-4" />
                                            Record Vitals
                                        </Button>
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </AnimatePresence>
                </table>
            </div>

            {/* Modal overlays for better UX */}
            <AnimatePresence>
                {selectedTask && viewingInstructions && (
                    <motion.div
                        className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="bg-white rounded-lg shadow-xl p-6 max-w-lg w-full border border-red-200"
                        >
                            <ViewDoctorInstructions
                                task={selectedTask}
                                onClose={() => {
                                    setSelectedTask(null);
                                    setViewingInstructions(false);
                                }}
                            />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {selectedTask && recordingVitals && (
                    <motion.div
                        className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="bg-white rounded-lg shadow-xl p-6 max-w-lg w-full border border-red-200"
                        >
                            <RecordVitalsForm
                                task={selectedTask}
                                onClose={() => {
                                    setSelectedTask(null);
                                    setRecordingVitals(false);
                                }}
                            />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
