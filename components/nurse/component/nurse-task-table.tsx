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
        <div className="bg-white rounded-xl shadow-md border border-gray-200">
            <table className="w-full text-sm">
                <thead>
                    <tr className="bg-[#f8fafc] border-b border-gray-200 w-full">
                        <TableHeader title="Patient" />
                        <TableHeader title="Created At" />
                        <TableHeader title="Vitals" />
                        <TableHeader title="Treatment Given" />
                        <TableHeader title="Doctor Instructions" />
                        <TableHeader title="Prescribed Medication" />
                        <TableHeader title="Doctor Diagnosis" />
                        <TableHeader title="Actions" />
                    </tr>
                </thead>
                <AnimatePresence>
                    <tbody>
                        {tasks.map((task, idx) => (
                            <TaskRow
                                key={task.$id}
                                task={task}
                                index={idx}
                                onSelectTask={setSelectedTaskId}
                                selectedTaskId={selectedTaskId}
                                refetch={refetch}
                            />
                        ))}
                    </tbody>
                </AnimatePresence>
            </table>
        </div>
    );
}

function TableHeader({ title }: { title: string }) {
    return (
        <th className="px-6 py-4 text-left font-medium text-gray-700 w-auto">
            {title}
        </th>
    );
}

function renderVitals(vitals: any) {
    if (!vitals) return <span className="text-gray-400">-</span>;
    // Show as a comma-separated string of key: value
    return (
        <div className="flex flex-col gap-0.5">
            {Object.entries(vitals).map(([key, value]) => (
                <span key={key} className="text-gray-700">
                    <span className="capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>: <span className="font-medium">{value as String || '-'}</span>
                </span>
            ))}
        </div>
    );
}

function TaskRow({
    task,
    index,
    onSelectTask,
    selectedTaskId,
    refetch
}: {
    task: NursingAction;
    index: number;
    onSelectTask: (id: string) => void;
    selectedTaskId: string | null;
    refetch: () => void;
}) {
    const patientName = task.patientDetails?.name || 'Unknown Patient';

    return (
        <motion.tr
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, delay: index * 0.04 }}
            className="hover:bg-[#f1f3f4] transition-colors w-full border-b border-gray-100 last:border-0"
            style={{ boxShadow: "0 1px 0 0 #e0e3e6" }}
        >
            <td className="px-6 py-4 text-gray-900 font-medium">
                {patientName}
            </td>
            <td className="px-6 py-4 text-gray-600">
                {formatDate(task?.taskDate || new Date().toISOString())}
            </td>
            <td className="px-6 py-4">
                {renderVitals(task?.vitals || {})}
            </td>
            <td className="px-6 py-4">
                {task.treatmentGiven ? (
                    <span className="text-gray-700">{task.treatmentGiven}</span>
                ) : (
                    <span className="text-gray-400">-</span>
                )}
            </td>
            <td className="px-6 py-4">
                {task.doctorInstructions ? (
                    <span className="text-gray-700">{task.doctorInstructions}</span>
                ) : (
                    <span className="text-gray-400">-</span>
                )}
            </td>
            <td className="px-6 py-4">
                {task.prescribedMedication ? (
                    <span className="text-gray-700">{task.prescribedMedication}</span>
                ) : (
                    <span className="text-gray-400">-</span>
                )}
            </td>
            <td className="px-6 py-4">
                {task.doctorDiagnosis ? (
                    <span className="text-gray-700">{task.doctorDiagnosis}</span>
                ) : (
                    <span className="text-gray-400">-</span>
                )}
            </td>
            <td className="px-6 py-4">
                <Dialog>
                    <DialogTrigger asChild>
                        <Button
                            variant="outline"
                            className="rounded-full border-gray-300 shadow-sm bg-white hover:bg-[#e8f0fe] text-blue-700 font-medium px-5 py-2 transition-colors"
                            onClick={() => onSelectTask(task.$id!)}
                        >
                            Record Vitals & Treatment
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl rounded-xl shadow-lg border border-gray-200">
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
    );
}
