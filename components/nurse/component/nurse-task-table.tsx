'use client';

import React, { Dispatch, useState } from 'react';
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

import { Thermometer, Activity, HeartPulse, Wind, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import clsx from 'clsx';

import { useReducer } from 'react';
import { patientReducer, initialPatientState } from '@/context/patients/patient-reducer';
import { PatientAction } from '@/context/patients/types';

export default function NurseTasksTable({ tasks, refetch }: Props) {
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
    const [state, dispatch] = useReducer(patientReducer, initialPatientState);

    // Empty state
    if (!tasks.length) {
        return (
            <div className="flex flex-col items-center justify-center py-24">
                <Info className="w-12 h-12 text-blue-300 mb-4" />
                <div className="text-xl font-semibold text-blue-600 mb-1">
                    No Nursing Tasks Assigned
                </div>
                <div className="text-gray-500">
                    You currently have no tasks to complete. Please check back later.
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-x-auto max-w-full p-2 md:p-6">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-blue-700 flex items-center gap-2">
                    <span className="inline-block w-2 h-6 bg-blue-500 rounded-full mr-2" />
                    Nursing Task List
                </h2>
                <span className="text-sm text-gray-500">
                    {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
                </span>
            </div>
            <table className="min-w-[1000px] w-full text-sm rounded-xl overflow-hidden">
                <thead className="bg-blue-50 border-b border-blue-100 sticky top-0 z-10">
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
                                className="px-6 py-4 text-left text-xs font-semibold text-blue-700 tracking-wide uppercase whitespace-nowrap"
                            >
                                {title}
                            </th>
                        ))}
                    </tr>
                </thead>

                <AnimatePresence>
                    <tbody className="divide-y divide-blue-50">
                        {tasks.map((task, idx) => (
                            <TaskRow
                                key={task.$id}
                                task={task}
                                dispatch={dispatch}
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
    const getColor = (label: string, value: number | null | undefined) => {
        if (value == null || isNaN(value)) return 'text-gray-400';

        const abnormal = {
            BP: value > 140 || value < 90,
            Temp: value > 38 || value < 36,
            Pulse: value > 100 || value < 60,
            Resp: value > 20 || value < 12,
        };

        return abnormal[label as keyof typeof abnormal] ? 'text-red-600 font-semibold' : 'text-green-700 font-semibold';
    };

    const VitalsItem = ({
        label,
        fullLabel,
        value,
        Icon,
    }: {
        label: 'BP' | 'Temp' | 'Pulse' | 'Resp';
        fullLabel: string;
        value: string | null | undefined;
        Icon: React.ElementType;
    }) => {
        const numericValue = value ? parseFloat(value) : null;
        const colorClass = getColor(label, numericValue);

        return (
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className="flex items-center gap-1.5 text-xs cursor-pointer group">
                        <Icon size={16} className="text-blue-400 group-hover:text-blue-600 transition" />
                        <span className="text-gray-500">{label}:</span>
                        <span className={clsx(colorClass, 'transition-colors duration-200')}>
                            {value || <span className="text-gray-300">-</span>}
                        </span>
                    </div>
                </TooltipTrigger>
                <TooltipContent side="top">
                    <div className="text-xs">
                        <strong>{fullLabel}</strong>
                        <br />
                        Normal range:
                        {label === 'BP' && ' 90–140'}
                        {label === 'Temp' && ' 36°C–38°C'}
                        {label === 'Pulse' && ' 60–100 bpm'}
                        {label === 'Resp' && ' 12–20 rpm'}
                    </div>
                </TooltipContent>
            </Tooltip>
        );
    };

    // Highlight if any vital is missing
    const isIncomplete = !task?.bloodPressure || !task?.temperature || !task?.pulseRate || !task?.respiratoryRate;

    return (
        <div
            className={clsx(
                'flex flex-col gap-1 transition-all min-w-[160px]',
                isIncomplete
                    ? 'border-l-4 border-yellow-400 pl-2 bg-yellow-50/40 rounded-md'
                    : 'border-l-4 border-green-200 pl-2 bg-green-50/30 rounded-md'
            )}
        >
            <VitalsItem label="BP" fullLabel="Blood Pressure" value={task?.bloodPressure} Icon={Activity} />
            <VitalsItem label="Temp" fullLabel="Temperature" value={task?.temperature} Icon={Thermometer} />
            <VitalsItem label="Pulse" fullLabel="Pulse Rate" value={task?.pulseRate} Icon={HeartPulse} />
            <VitalsItem label="Resp" fullLabel="Respiratory Rate" value={task?.respiratoryRate} Icon={Wind} />
            {isIncomplete && (
                <div className="text-xs text-yellow-700 mt-1 flex items-center gap-1">
                    <Info className="w-3.5 h-3.5" />
                    Incomplete
                </div>
            )}
        </div>
    );
}

function TaskRow({
    task,
    index,
    onSelectTask,
    selectedTaskId,
    refetch,
    dispatch
}: {
    task: NursingAction;
    index: number;
    dispatch: Dispatch<PatientAction>;
    onSelectTask: (id: string) => void;
    selectedTaskId: string | null;
    refetch: () => void;

}) {
    // For improved accessibility, highlight the selected row
    const isSelected = selectedTaskId === task.$id;

    return (
        <motion.tr
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, delay: index * 0.02 }}
            className={clsx(
                "bg-white hover:bg-blue-50 transition-all",
                isSelected && "ring-2 ring-blue-300 ring-inset"
            )}
        >
            <td className="px-6 py-5 font-semibold text-blue-900 whitespace-nowrap">
                {typeof task.patientId === 'object' && task.patientId !== null
                    ? (task.patientId as any).name
                    : task.patientId || <span className="italic text-gray-400">Fetching name...</span>}
            </td>
            <td className="px-6 py-5 text-gray-600 whitespace-nowrap">
                {formatDate(task?.taskDate || new Date().toISOString())}
            </td>
            <td className="px-6 py-5">{renderVitalsFromFields(task)}</td>
            <td className="px-6 py-5 text-gray-700 max-w-[180px] truncate">
                {task.treatmentGiven ? (
                    <span className="block">{task.treatmentGiven}</span>
                ) : (
                    <span className="text-gray-400">-</span>
                )}
            </td>
            <td className="px-6 py-5 text-gray-700 max-w-[180px] truncate">
                {task.doctorInstructions ? (
                    <span className="block">{task.doctorInstructions}</span>
                ) : (
                    <span className="text-gray-400">-</span>
                )}
            </td>
            <td className="px-6 py-5 text-gray-700 max-w-[180px] truncate">
                {task.prescribedMedication ? (
                    <span className="block">{task.prescribedMedication}</span>
                ) : (
                    <span className="text-gray-400">-</span>
                )}
            </td>
            <td className="px-6 py-5 text-gray-700 max-w-[180px] truncate">
                {task.doctorDiagnosis ? (
                    <span className="block">{task.doctorDiagnosis}</span>
                ) : (
                    <span className="text-gray-400">-</span>
                )}
            </td>
            <td className="px-6 py-5">
                <Dialog open={isSelected} onOpenChange={(open) => open ? onSelectTask(task.$id!) : onSelectTask("")}>
                    <DialogTrigger asChild>
                        <Button
                            variant="outline"
                            className={clsx(
                                "rounded-lg border border-blue-300 text-blue-700 hover:bg-blue-100 font-semibold px-4 py-2 transition-colors shadow-sm",
                                isSelected && "ring-2 ring-blue-400"
                            )}
                            onClick={() => onSelectTask(task.$id!)}
                            aria-label={`Record vitals for ${task.patient?.name || 'patient'}`}
                        >
                            Record Vitals
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl rounded-2xl p-0 overflow-hidden shadow-2xl border-0">
                        <div className="bg-gradient-to-br from-blue-50 to-white p-6">
                            <VitalsTreatmentForm
                                documentId={selectedTaskId!}
                                patientId={typeof task.patientId === 'object' && task.patientId !== null ? (task.patientId as any).$id : task.patientId}
                                dispatch={dispatch}
                                onSuccess={() => {
                                    refetch();
                                    onSelectTask("");
                                    toast.success('Vitals and treatment recorded successfully');
                                }}
                            />
                        </div>
                    </DialogContent>
                </Dialog>
            </td>
        </motion.tr>
    );
}
