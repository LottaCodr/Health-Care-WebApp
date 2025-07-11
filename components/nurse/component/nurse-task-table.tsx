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
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="min-w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                        {[
                            'Patient',
                            'Created At',
                            'Vitals',
                            'Treatment Given',
                            'Doctor Instructions',
                            'Prescribed Medication',
                            'Doctor Diagnosis',
                            'Actions'
                        ].map((title) => (
                            <th
                                key={title}
                                className="px-6 py-4 text-left text-xs font-semibold text-gray-600 tracking-wide uppercase whitespace-nowrap"
                            >
                                {title}
                            </th>
                        ))}
                    </tr>
                </thead>

                <AnimatePresence>
                    <tbody className="divide-y divide-gray-100">
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

function renderVitalsFromFields(task: NursingAction) {
    const item = (label: string, value: string | null | undefined) => (
        <div className="text-gray-700 text-sm">
            <span className="font-medium text-gray-500">{label}: </span>
            <span className="font-semibold">{value || '-'}</span>
        </div>
    );

    return (
        <div className="flex flex-col gap-1">
            {item('Blood Pressure', task?.bloodPressure)}
            {item('Temperature', task?.temperature)}
            {item('Pulse Rate', task?.pulseRate)}
            {item('Respiratory Rate', task?.respiratoryRate)}
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
    return (
        <motion.tr
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, delay: index * 0.02 }}
            className="bg-white hover:bg-gray-50 transition-all"
        >
            <td className="px-6 py-5 font-medium text-gray-900">
                {task.patientId?.name || 'Unknown'}
            </td>
            <td className="px-6 py-5 text-gray-600">
                {formatDate(task?.taskDate || new Date().toISOString())}
            </td>
            <td className="px-6 py-5">{renderVitalsFromFields(task)}</td>
            <td className="px-6 py-5 text-gray-700">
                {task.treatmentGiven || <span className="text-gray-400">-</span>}
            </td>
            <td className="px-6 py-5 text-gray-700">
                {task.doctorInstructions || <span className="text-gray-400">-</span>}
            </td>
            <td className="px-6 py-5 text-gray-700">
                {task.prescribedMedication || <span className="text-gray-400">-</span>}
            </td>
            <td className="px-6 py-5 text-gray-700">
                {task.doctorDiagnosis || <span className="text-gray-400">-</span>}
            </td>
            <td className="px-6 py-5">
                <Dialog>
                    <DialogTrigger asChild>
                        <Button
                            variant="outline"
                            className="rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50 font-medium px-4 py-2 transition-colors"
                            onClick={() => onSelectTask(task.$id!)}
                        >
                            Record Vitals
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl rounded-xl p-6">
                        <VitalsTreatmentForm
                            documentId={selectedTaskId!}
                            onSuccess={() => {
                                refetch();
                                toast.success('Vitals and treatment recorded successfully');
                            }}
                        />
                    </DialogContent>
                </Dialog>
            </td>
        </motion.tr>
    );
}
