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

import { Thermometer, Activity, HeartPulse, Wind } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import clsx from 'clsx';

import { useReducer } from 'react';
import { patientReducer, initialPatientState } from '@/context/patients/patient-reducer';
import { PatientAction } from '@/context/patients/types';

export default function NurseTasksTable({ tasks, refetch }: Props) {
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
    const [state, dispatch] = useReducer(patientReducer, initialPatientState);

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-auto max-w-full">
            <table className="min-w-[1000px] w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
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

        return abnormal[label as keyof typeof abnormal] ? 'text-red-600 font-semibold' : 'text-green-700';
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
                    <div className="flex items-center gap-1.5 text-xs cursor-default">
                        <Icon size={14} className="text-gray-400" />
                        <span className="text-gray-500">{label}:</span>
                        <span className={clsx(colorClass, 'transition-colors duration-200')}>
                            {value || '-'}
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

    return (
        <div
            className={clsx(
                'flex flex-col gap-1 transition-all',
                (!task?.bloodPressure || !task?.temperature || !task?.pulseRate || !task?.respiratoryRate)
                    ? 'border-l-2 border-yellow-400 pl-2'
                    : ''
            )}
        >
            <VitalsItem label="BP" fullLabel="Blood Pressure" value={task?.bloodPressure} Icon={Activity} />
            <VitalsItem label="Temp" fullLabel="Temperature" value={task?.temperature} Icon={Thermometer} />
            <VitalsItem label="Pulse" fullLabel="Pulse Rate" value={task?.pulseRate} Icon={HeartPulse} />
            <VitalsItem label="Resp" fullLabel="Respiratory Rate" value={task?.respiratoryRate} Icon={Wind} />
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
    return (
        <motion.tr
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, delay: index * 0.02 }}
            className="bg-white hover:bg-gray-50 transition-all"
        >
            <td className="px-6 py-5 font-medium text-gray-900">
                {String(task.patient?.name) || 'Fetching name...'}
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
                            patientId={typeof task.patientId === 'object' && task.patientId !== null ? (task.patientId as any).$id : task.patientId}
                            dispatch={dispatch}
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
