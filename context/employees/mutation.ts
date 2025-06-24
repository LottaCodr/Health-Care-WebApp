import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEmployeesContext } from "./context";
import { deleteStaff, updateStaff } from "@/actions/staff/update.deletestaff";
import { Staff } from "@/actions/staff/types";

export function useStaffMutations() {
    const { dispatch } = useEmployeesContext();
    const queryClient = useQueryClient()

    //Update Staff mutation
    const updateMutation = useMutation({
        mutationFn: ({ id, updates }: { id: string; updates: Partial<Staff> }) => updateStaff(id, updates),

        onMutate: async ({ id, updates }) => {

            //save previous state in case of rollback needed
            const prev = queryClient.getQueryData<Staff[]>(['employees']);

            const prevEmployee = prev?.find(e => e.$id === id);

            if (prevEmployee) {
                const optimistic = {
                    ...prevEmployee, ...updates
                }
                dispatch({ type: "UPDATE_EMPLOYEE", payload: optimistic })
            } return { prevEmployee }
        },
        onError: (err, _, context) => {
            if (context?.prevEmployee) {
                dispatch({ type: "UPDATE_EMPLOYEE", payload: context?.prevEmployee })
            }
        },
        onSuccess: (updated) => {
            dispatch({ type: "UPDATE_EMPLOYEE", payload: updated })
        },

        onSettled() {
            queryClient.invalidateQueries({ queryKey: ['employees'] })
        },

    })


    //Remove Staff 
    const deleteMutation = useMutation<Staff, Error, string, { deleted?: Staff }>({
        mutationFn: deleteStaff,
        onMutate: async (id: string) => {
            const prev = queryClient.getQueryData<Staff[]>(['employees']);

            const deleted = prev?.find(e => e.$id === id)
            dispatch({ type: "DELETE_EMPLOYEE", payload: id }
            )
            return { deleted }
        },
        onError: (err, id, context) => {
            if (context?.deleted) {
                dispatch({ type: "ADD_EMPLOYEE", payload: context.deleted })
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