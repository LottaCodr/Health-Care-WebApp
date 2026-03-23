// "use client"

// import {
//   ColumnDef,
//   flexRender,
//   getCoreRowModel,
//   getPaginationRowModel,
//   useReactTable,
// } from "@tanstack/react-table"

// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from "@/components/ui/table"

// import { Button } from "@/components/ui/button"
// import Image from "next/image"
// import { useRealTimeAppointments } from "@/context/appointments/appointment.reducer"
// import { FiChevronLeft, FiChevronRight } from "react-icons/fi"

// interface DataTableProps<TData, TValue> {
//   columns: ColumnDef<TData, TValue>[]
//   data: TData[]
// }

// export function DataTable<TData, TValue>({
//   columns,
//   data,
// }: DataTableProps<TData, TValue>) {
//   const table = useReactTable({
//     data,
//     columns,
//     getCoreRowModel: getCoreRowModel(),
//     getPaginationRowModel: getPaginationRowModel(),
//   })

//   const { state } = useRealTimeAppointments()
//   const isLoading = state.loading

//   // Remove dev logs for production UX

//   const currentPage = table.getState().pagination.pageIndex + 1
//   const totalPages = table.getPageCount()

//   return (
//     <div className="w-full overflow-x-auto rounded-2xl border border-gray-200 shadow-lg bg-white">
//       <Table className="min-w-full">
//         <TableHeader className="bg-gray-50 text-gray-700 sticky top-0 z-10">
//           {table.getHeaderGroups().map((headerGroup) => (
//             <TableRow key={headerGroup.id}>
//               {headerGroup.headers.map((header) => (
//                 <TableHead
//                   key={header.id}
//                   className="text-left text-base font-bold px-5 py-4 bg-gray-50"
//                   style={{
//                     borderBottom: "2px solid #f3f4f6",
//                     letterSpacing: "0.01em",
//                   }}
//                 >
//                   {header.isPlaceholder
//                     ? null
//                     : flexRender(
//                         header.column.columnDef.header,
//                         header.getContext()
//                       )}
//                 </TableHead>
//               ))}
//             </TableRow>
//           ))}
//         </TableHeader>
//         <TableBody>
//           {isLoading ? (
//             <TableRow>
//               <TableCell colSpan={columns.length} className="text-center py-16">
//                 <div className="flex flex-col items-center gap-3">
//                   <svg
//                     className="animate-spin h-8 w-8 text-primary"
//                     viewBox="0 0 24 24"
//                     fill="none"
//                   >
//                     <circle
//                       className="opacity-25"
//                       cx="12"
//                       cy="12"
//                       r="10"
//                       stroke="currentColor"
//                       strokeWidth="4"
//                     />
//                     <path
//                       className="opacity-75"
//                       fill="currentColor"
//                       d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
//                     />
//                   </svg>
//                   <span className="text-gray-500 text-base font-medium">
//                     Loading appointments...
//                   </span>
//                 </div>
//               </TableCell>
//             </TableRow>
//           ) : table.getRowModel().rows.length ? (
//             table.getRowModel().rows.map((row, idx) => (
//               <TableRow
//                 key={row.id}
//                 className={`transition-colors duration-100 hover:bg-gray-50 ${
//                   idx % 2 === 1 ? "bg-gray-50/50" : ""
//                 }`}
//               >
//                 {row.getVisibleCells().map((cell) => (
//                   <TableCell
//                     key={cell.id}
//                     className="px-5 py-4 text-base text-gray-800 align-middle"
//                   >
//                     {flexRender(cell.column.columnDef.cell, cell.getContext())}
//                   </TableCell>
//                 ))}
//               </TableRow>
//             ))
//           ) : (
//             <TableRow>
//               <TableCell
//                 colSpan={columns.length}
//                 className="text-center py-16 text-gray-400"
//               >
//                 <div className="flex flex-col items-center gap-3">
//                   <Image
//                     src="/assets/icons/empty.svg"
//                     width={48}
//                     height={48}
//                     alt="No results"
//                     className="opacity-70"
//                   />
//                   <span className="text-lg font-medium">
//                     No appointments found.
//                   </span>
//                   <span className="text-sm text-gray-400">
//                     Try adjusting your filters or booking a new appointment.
//                   </span>
//                 </div>
//               </TableCell>
//             </TableRow>
//           )}
//         </TableBody>
//       </Table>

//       <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-5 py-4 border-t bg-gray-50 rounded-b-2xl">
//         <div className="text-sm text-gray-500">
//           Page <span className="font-semibold text-gray-700">{currentPage}</span> of{" "}
//           <span className="font-semibold text-gray-700">{totalPages}</span>
//         </div>
//         <div className="flex items-center gap-2">
//           <Button
//             variant="ghost"
//             size="icon"
//             onClick={() => table.setPageIndex(0)}
//             disabled={!table.getCanPreviousPage()}
//             className="rounded-full p-2 disabled:opacity-40"
//             aria-label="First page"
//           >
//             <FiChevronLeft className="w-5 h-5 -ml-1" />
//             <FiChevronLeft className="w-5 h-5 -ml-2" />
//           </Button>
//           <Button
//             variant="ghost"
//             size="icon"
//             onClick={() => table.previousPage()}
//             disabled={!table.getCanPreviousPage()}
//             className="rounded-full p-2 disabled:opacity-40"
//             aria-label="Previous page"
//           >
//             <FiChevronLeft className="w-6 h-6" />
//           </Button>
//           <Button
//             variant="ghost"
//             size="icon"
//             onClick={() => table.nextPage()}
//             disabled={!table.getCanNextPage()}
//             className="rounded-full p-2 disabled:opacity-40"
//             aria-label="Next page"
//           >
//             <FiChevronRight className="w-6 h-6" />
//           </Button>
//           <Button
//             variant="ghost"
//             size="icon"
//             onClick={() => table.setPageIndex(totalPages - 1)}
//             disabled={!table.getCanNextPage()}
//             className="rounded-full p-2 disabled:opacity-40"
//             aria-label="Last page"
//           >
//             <FiChevronRight className="w-5 h-5 -mr-1" />
//             <FiChevronRight className="w-5 h-5 -mr-2" />
//           </Button>
//         </div>
//       </div>
//     </div>
//   )
// }
