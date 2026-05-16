import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEmployeeStore } from "@/store/employee-store";
import { deleteStaff, updateStaff } from "@/actions/staff/update.deletestaff";
import { Staff } from "@/actions/staff/types";

export function useStaffMutations() {
    const { updateEmployee, deleteEmployee, addEmployee } = useEmployeeStore();
    const queryClient = useQueryClient()

    //Update Staff mutation
    const updateMutation = useMutation({
        mutationFn: ({ id, updates }: { id: string; updates: any }) => updateStaff(id, updates),

        onMutate: async ({ id, updates }) => {

            //save previous state in case of rollback needed
            const prev = queryClient.getQueryData<Staff[]>(['employees']);

            const prevEmployee = prev?.find(e => e.$id === id);

            if (prevEmployee) {
                const optimistic = {
                    ...prevEmployee, ...updates
                }
                updateEmployee(optimistic)
            } return { prevEmployee }
        },
        onError: (err, _, context) => {
            if (context?.prevEmployee) {
                updateEmployee(context?.prevEmployee)
            }
        },
        onSuccess: (updated) => {
            updateEmployee(updated)
        },

        onSettled() {
            queryClient.invalidateQueries({ queryKey: ['employees'] })
        },

    })


    //Remove Staff 
    const deleteMutation = useMutation<any, Error, string, { deleted?: Staff }>({
        mutationFn: deleteStaff,
        onMutate: async (id: string) => {
            const prev = queryClient.getQueryData<Staff[]>(['employees']);

            const deleted = prev?.find(e => e.$id === id)
            deleteEmployee(id)
            return { deleted }
        },
        onError: (err, id, context) => {
            if (context?.deleted) {
                addEmployee(context.deleted)
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({
                queryKey: ['employees']
            })
        }
    })
    return {
        updateStaff: updateMutation.mutate,
        deleteStaff: deleteMutation.mutate
    }

}