'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Task } from '@/context/nurse/types';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import ViewDoctorInstructions from './view-doctor-instructions';
import RecordVitalsForm from './record-vitals-form';

interface Props {
    tasks: Task[];
}

export default function NurseTaskTable({ tasks }: Props) {
    const router = useRouter();
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [viewingInstructions, setViewingInstructions] = useState(false);
    const [recordingVitals, setRecordingVitals] = useState(false);

    if (tasks.length === 0) {
        return (
            <div className="text-center p-6 text-muted-foreground">
                No assigned patients at the moment.
            </div>
        );
    }

    return (
        <div className="p-4">
            <table className="min-w-full divide-y divide-border text-sm">
                <thead className="bg-muted">
                    <tr>
                        <th className="px-4 py-3 text-left">Patient Name</th>
                        <th className="px-4 py-3 text-left">Status</th>
                        <th className="px-4 py-3 text-left">Actions</th>
                    </tr>
                </thead>
                <AnimatePresence>
                    <tbody className="divide-y divide-border">
                        {tasks.map((task) => (
                            <motion.tr
                                key={task.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.3 }}
                            >
                                <td className="px-4 py-3">{task.patientName}</td>
                                <td className="px-4 py-3 capitalize">{task.status}</td>
                                <td className="px-4 py-3 flex gap-2">
                                    <Button
                                        size="sm"
                                        onClick={() => {
                                            setSelectedTask(task);
                                            setViewingInstructions(true);
                                        }}
                                    >
                                        View Instructions
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                            setSelectedTask(task);
                                            setRecordingVitals(true);
                                        }}
                                    >
                                        Record Vitals
                                    </Button>
                                </td>
                            </motion.tr>
                        ))}
                    </tbody>
                </AnimatePresence>
            </table>

            {selectedTask && viewingInstructions && (
                <ViewDoctorInstructions
                    task={selectedTask}
                    onClose={() => {
                        setSelectedTask(null);
                        setViewingInstructions(false);
                    }}
                />
            )}

            {selectedTask && recordingVitals && (
                <RecordVitalsForm
                    task={selectedTask}
                    onClose={() => {
                        setSelectedTask(null);
                        setRecordingVitals(false);
                    }}
                />
            )}
        </div>
    );
}
