// 'use client';

// import React, { useEffect, useMemo, useState } from 'react';
// import Filters from './filters';
// import AppointmentTable from './table';
// import CalendarView from './calendar-view';
// import AppointmentModal from './modal';
// import { useRealTimeAppointments } from '@/context/appointments/appointment.reducer';
// import { toast } from '@/hooks/use-toast';
// import { Appointment } from '@/actions/appointments/types';

// const PAGE_SIZE = 10;

// const AppointmentsComponent: React.FC = () => {
//     const { state, dispatch } = useRealTimeAppointments();
//     const { appointments, loading } = state;

//     // Local UI state
//     const [search, setSearch] = useState('');
//     const [statusFilter, setStatusFilter] = useState<'all' | Appointment['status']>('all');
//     const [timeFormat, setTimeFormat] = useState<'12h' | '24h'>('12h');
//     const [dateRange, setDateRange] = useState<'all' | 'today' | 'thisWeek' | 'custom'>('all');
//     const [customRange, setCustomRange] = useState<{ startDate: Date | null; endDate: Date | null }>({ startDate: null, endDate: null });
//     const [sortBy, setSortBy] = useState<'date' | 'patientName'>('date');
//     const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
//     const [page, setPage] = useState(1);
//     const [showModal, setShowModal] = useState(false);
//     const [editing, setEditing] = useState<Appointment | null>(null);

//     // Reset pagination on filter changes
//     useEffect(() => {
//         setPage(1);
//     }, [search, statusFilter, dateRange, customRange]);

//     // Helpers
//     const filterAppointments = useMemo(() => {
//         return appointments.filter((appt) => {
//             if (!appt || !appt.patientName) return false;

//             const matchesSearch = appt.patientName.toLowerCase().includes(search.toLowerCase());
//             const matchesStatus = statusFilter === 'all' || appt.status === statusFilter;

//             const matchesDate = (() => {
//                 const date = new Date(appt.date);
//                 if (dateRange === 'today') {
//                     return date.toDateString() === new Date().toDateString();
//                 }
//                 if (dateRange === 'thisWeek') {
//                     const now = new Date();
//                     const start = new Date(now.setDate(now.getDate() - now.getDay()));
//                     const end = new Date(start);
//                     end.setDate(start.getDate() + 6);
//                     return date >= start && date <= end;
//                 }
//                 if (dateRange === 'custom' && customRange.startDate && customRange.endDate) {
//                     return date >= customRange.startDate && date <= customRange.endDate;
//                 }
//                 return true;
//             })();

//             return matchesSearch && matchesStatus && matchesDate;
//         });
//     }, [appointments, search, statusFilter, dateRange, customRange]);

//     const sortedAppointments = useMemo(() => {
//         return [...filterAppointments].sort((a, b) => {
//             const aValue = sortBy === 'date' ? new Date(a.date).getTime() : a.patientName.toLowerCase();
//             const bValue = sortBy === 'date' ? new Date(b.date).getTime() : b.patientName.toLowerCase();

//             if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
//             if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
//             return 0;
//         });
//     }, [filterAppointments, sortBy, sortOrder]);

//     const paginatedAppointments = useMemo(() => {
//         const start = (page - 1) * PAGE_SIZE;
//         return sortedAppointments.slice(start, start + PAGE_SIZE);
//     }, [sortedAppointments, page]);

//     // Modal Handlers
//     const handleEdit = (id: string) => {
//         const appt = appointments.find((a) => a.id === id || a.id === id) || null;
//         setEditing(appt);
//         setShowModal(true);
//     };

//     const handleDelete = (id: string) => {
//         dispatch({ type: 'DELETE_APPOINTMENT', payload: id });
//         toast({
//             title: 'Appointment deleted',
//             description: 'The appointment has been deleted.',
//             variant: 'destructive',
//         });
//     };

//     const handleCreate = () => {
//         setEditing(null);
//         setShowModal(true);
//     };

//     const handleSave = (updated: Appointment) => {
//         const exists = appointments.find((a) => a.id === updated.id || a.id === updated.id);

//         if (exists) {
//             dispatch({ type: 'UPDATE_APPOINTMENT', payload: updated });
//             toast({
//                 title: 'Appointment updated',
//                 description: `Appointment with ${updated.patientName} updated.`,
//             });
//         } else {
//             dispatch({ type: 'ADD_APPOINTMENT', payload: updated });
//             toast({
//                 title: 'Appointment created',
//                 description: `Appointment with ${updated.patientName} created.`,
//             });
//         }

//         setShowModal(false);
//     };

//     // UI/UX improvements: 
//     // - Use red as primary color
//     // - Add subtle card, shadow, and border for main container
//     // - Add sticky header for filters and actions
//     // - Add tooltip for "+ New" button
//     // - Add subtle animation for modal
//     // - Add loading spinner overlay when loading
//     // - Add empty state for no appointments

//     return (
//         <div className="relative space-y-8 max-w-7xl mx-auto px-4 sm:px-6 py-10 bg-white dark:bg-zinc-900 rounded-xl shadow-lg border border-red-200 dark:border-red-900 transition-all duration-300">
//             {/* Loading overlay */}
//             {loading && (
//                 <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/70 dark:bg-zinc-900/70 rounded-xl">
//                     <svg className="animate-spin h-10 w-10 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
//                         <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
//                         <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
//                     </svg>
//                 </div>
//             )}

//             {/* Sticky header for filters and actions */}
//             <div className="sticky top-0 z-20 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md rounded-t-xl pt-4 pb-2 px-2 flex flex-col sm:flex-row justify-between items-center gap-4 border-b border-red-100 dark:border-red-800">
//                 <h2 className="text-3xl font-extrabold text-red-700 dark:text-red-400 flex items-center gap-2">
//                     <svg className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
//                         <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
//                     </svg>
//                     Doctor&apos;s Appointments
//                 </h2>
//                 <div className="flex items-center gap-3">
//                     <Filters
//                         search={search}
//                         setSearch={setSearch}
//                         statusFilter={statusFilter}
//                         setStatusFilter={setStatusFilter}
//                         timeFormat={timeFormat}
//                         setTimeFormat={setTimeFormat}
//                         dateRange={dateRange}
//                         setDateRange={setDateRange}
//                         customRange={customRange}
//                         setCustomRange={setCustomRange}
//                     />
//                     <div className="relative group">
//                         <button
//                             onClick={handleCreate}
//                             className="bg-red-600 hover:bg-red-700 transition-colors duration-150 text-white px-5 py-2 rounded-lg font-semibold shadow-md focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2"
//                             aria-label="Create new appointment"
//                         >
//                             <span className="text-lg">+ New</span>
//                         </button>
//                         <span className="absolute left-1/2 -translate-x-1/2 mt-2 w-max opacity-0 group-hover:opacity-100 transition bg-red-700 text-white text-xs rounded px-2 py-1 pointer-events-none z-10 shadow-lg">
//                             Create a new appointment
//                         </span>
//                     </div>
//                 </div>
//             </div>

//             {/* Table or empty state */}
//             {paginatedAppointments.length > 0 ? (
//                 <AppointmentTable
//                     appointments={paginatedAppointments}
//                     onEdit={handleEdit}
//                     onDelete={handleDelete}
//                     timeFormat={timeFormat}
//                     sortBy={sortBy}
//                     setSortBy={setSortBy}
//                     sortOrder={sortOrder}
//                     setSortOrder={setSortOrder}
//                     page={page}
//                     setPage={setPage}
//                     pageSize={PAGE_SIZE}
//                     total={sortedAppointments.length}
//                     loading={loading}
//                 />
//             ) : (
//                 <div className="flex flex-col items-center justify-center py-16 text-center text-zinc-500 dark:text-zinc-400">
//                     <svg className="w-16 h-16 mb-4 text-red-300" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
//                         <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
//                     </svg>
//                     <div className="text-lg font-semibold mb-2">No appointments found</div>
//                     <div className="mb-4">Try adjusting your filters or create a new appointment.</div>
//                     <button
//                         onClick={handleCreate}
//                         className="bg-red-600 hover:bg-red-700 transition-colors duration-150 text-white px-5 py-2 rounded-lg font-semibold shadow-md focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2"
//                     >
//                         + New Appointment
//                     </button>
//                 </div>
//             )}

//             {/* Calendar view */}
//             <div className="rounded-xl border border-red-100 dark:border-red-800 bg-red-50/30 dark:bg-zinc-900/40 shadow-inner p-4">
//                 <CalendarView
//                     appointments={filterAppointments}
//                     onEdit={(appt) => handleEdit(appt.id || appt.id)}
//                 />
//             </div>

//             {/* Modal with animation */}
//             {showModal && (
//                 <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 backdrop-blur-sm animate-fadeIn">
//                     <AppointmentModal
//                         isOpen={showModal}
//                         initialData={editing}
//                         onClose={() => setShowModal(false)}
//                         onSave={handleSave}
//                         existingAppointments={filterAppointments}
//                     />
//                 </div>
//             )}

//             <style jsx global>{`
//                 @keyframes fadeIn {
//                     from { opacity: 0; }
//                     to { opacity: 1; }
//                 }
//                 .animate-fadeIn {
//                     animation: fadeIn 0.2s ease;
//                 }
//             `}</style>
//         </div>
//     );
// };

// export default AppointmentsComponent;
