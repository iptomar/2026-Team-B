import { create } from 'zustand';

export const useApprovalStore = create((set) => ({
    pendingItems: [],
    setPendingItems: (items) => set({ pendingItems: items }),
    updateSubmissionState: (submissionId, status, currentNodeId, assignedTo) => 
        set((state) => ({
            pendingItems: state.pendingItems.map((item) => {
                if (item._id === submissionId) {
                    return { ...item, status, currentNodeId, assignedTo };
                }
                return item;
            })
        })),
    removeSubmission: (submissionId) => 
        set((state) => ({
            pendingItems: state.pendingItems.filter((item) => item._id !== submissionId)
        })),
}));
