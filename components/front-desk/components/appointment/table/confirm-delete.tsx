// import * as React from "react";
// import {
//     Dialog,
//     DialogContent,
//     DialogHeader,
//     DialogTitle,
//     DialogDescription,
//     DialogFooter,
// } from "@/components/ui/dialog";
// import { Button } from "@/components/ui/button";
// import { FiAlertTriangle } from "react-icons/fi";

// interface ConfirmDeleteModalProps {
//     isOpen: boolean;
//     onClose: () => void;
//     onConfirm: () => void;
//     appointmentName: string;
// }

// export function ConfirmDeleteModal({
//     isOpen,
//     onClose,
//     onConfirm,
//     appointmentName,
// }: ConfirmDeleteModalProps) {
//     const [loading, setLoading] = React.useState(false);

//     const handleConfirm = async () => {
//         setLoading(true);
//         try {
//             await onConfirm();
//         } finally {
//             setLoading(false);
//             onClose();
//         }
//     };

//     return (
//         <Dialog open={isOpen} onOpenChange={onClose}>
//             <DialogContent className="sm:max-w-lg">
//                 <DialogHeader>
//                     <div className="flex items-center gap-3 mb-2">
//                         <span className="rounded-full bg-red-100 p-2">
//                             <FiAlertTriangle className="text-red-600 w-6 h-6" />
//                         </span>
//                         <DialogTitle className="text-lg font-semibold text-red-700">
//                             Delete Appointment?
//                         </DialogTitle>
//                     </div>
//                     <DialogDescription className="text-gray-700">
//                         <span>
//                             Are you sure you want to <span className="font-semibold text-red-700">permanently delete</span> the appointment for{" "}
//                             <span className="font-semibold text-gray-900">{appointmentName}</span>?
//                         </span>
//                         <br />
//                         <span className="text-sm text-gray-500">
//                             This action cannot be undone. All information related to this appointment will be lost.
//                         </span>
//                     </DialogDescription>
//                 </DialogHeader>
//                 <DialogFooter className="flex justify-end gap-3 mt-4">
//                     <Button
//                         variant="outline"
//                         onClick={onClose}
//                         disabled={loading}
//                         className="min-w-[90px]"
//                     >
//                         Cancel
//                     </Button>
//                     <Button
//                         variant="destructive"
//                         onClick={handleConfirm}
//                         disabled={loading}
//                         className="min-w-[90px] flex items-center gap-2"
//                     >
//                         {loading ? (
//                             <>
//                                 <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
//                                     <circle
//                                         className="opacity-25"
//                                         cx="12"
//                                         cy="12"
//                                         r="10"
//                                         stroke="currentColor"
//                                         strokeWidth="4"
//                                         fill="none"
//                                     />
//                                     <path
//                                         className="opacity-75"
//                                         fill="currentColor"
//                                         d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
//                                     />
//                                 </svg>
//                                 Deleting...
//                             </>
//                         ) : (
//                             <>
//                                 <FiAlertTriangle className="w-4 h-4" />
//                                 Delete
//                             </>
//                         )}
//                     </Button>
//                 </DialogFooter>
//             </DialogContent>
//         </Dialog>
//     );
// }
