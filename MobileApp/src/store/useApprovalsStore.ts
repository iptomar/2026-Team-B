import { create } from 'zustand';
import api from '../services/api';

interface ApprovalsState {
	submissions: any[];
	loading: boolean;
	error: string | null;
	fetchPending: () => Promise<void>;
	removeSubmission: (id: string) => void;
	updateSubmission: (id: string, data: any) => void;
}

export const useApprovalsStore = create<ApprovalsState>((set, get) => ({
	submissions: [],
	loading: true,
	error: null,
	fetchPending: async () => {
		set({ loading: true, error: null });
		try {
			const response = await api.get('/formSubmissions/pending');
			set({ submissions: response.data, loading: false });
		} catch (error: any) {
			console.error(error);
			set({ error: error.message || 'Failed to fetch pending approvals', loading: false });
		}
	},
	removeSubmission: (id: string) => {
		set((state) => ({
			submissions: state.submissions.filter((s) => s._id !== id),
		}));
	},
	updateSubmission: (id: string, data: any) => {
		set((state) => ({
			submissions: state.submissions.map((s) => (s._id === id ? { ...s, ...data } : s)),
		}));
	},
}));
