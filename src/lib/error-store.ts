import { writable } from 'svelte/store';

export interface AppError {
	id: string;
	message: string;
	type: 'error' | 'warning' | 'success';
	timestamp: Date;
}

export const errors = writable<AppError[]>([]);
export const isLoading = writable<boolean>(false);
export const isSaving = writable<boolean>(false);

export function showError(message: string, type: 'error' | 'warning' | 'success' = 'error') {
	const error: AppError = {
		id: Date.now().toString(),
		message,
		type,
		timestamp: new Date()
	};

	errors.update((current) => [...current, error]);

	setTimeout(() => {
		errors.update((current) => current.filter((e) => e.id !== error.id));
	}, 5000);
}

export function clearError(id: string) {
	errors.update((current) => current.filter((e) => e.id !== id));
}

export function clearAllErrors() {
	errors.set([]);
}
