'use client';

import React, { useState } from 'react';
import { formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { NursingAction } from '@/actions/nursing-action/types';
import VitalsTreatmentForm from './vitals-and-treatment-form';

interface Props {
    tasks: NursingAction[];
    refetch: () => void;
}

export default function NurseTasksTable({ tasks, refetch }: Props) {
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border text-sm">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-4 py-2 text-left">Patient</th>
                        <th className="px-4 py-2 text-left">Created At</th>
                        <th className="px-4 py-2 text-left">Actions</th>
                    </tr>
                </thead>
                <AnimatePresence>
                    <tbody className="divide-y divide-border">
                        {tasks.map((task) => (
                            <motion.tr
                                key={task.$id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.3 }}
                            >
                                <td className="px-4 py-2">{task.patientName ?? 'Unknown Patient'}</td>
                                <td className="px-4 py-2">{formatDate(task.createdAt)}</td>
                                <td className="px-4 py-2">
                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <Button
                                                variant="outline"
                                                onClick={() => setSelectedTaskId(task.$id)}
                                            >
                                                Record Vitals & Treatment
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="max-w-2xl">
                                            <h2 className="text-lg font-semibold mb-4">
                                                Record Vitals & Treatment
                                            </h2>
                                            <VitalsTreatmentForm
                                                documentId={selectedTaskId!}
                                                onSuccess={() => {
                                                    refetch();
                                                    toast.success('Vitals and treatment successfully recorded!');
                                                }}
                                            />
                                        </DialogContent>
                                    </Dialog>
                                </td>
                            </motion.tr>
                        ))}
                    </tbody>
                </AnimatePresence>
            </table>
        </div>
    );
}
