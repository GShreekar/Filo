import { writable, get } from 'svelte/store';
import { updateNote } from './firebase-service';
import { showError } from './error-store';

interface AutoSaveState {
	noteId: string | null;
	content: string;
	title: string;
	contentDirty: boolean;
	titleDirty: boolean;
	lastSaved: Date | null;
	isSaving: boolean;
	retryCount: number;
}

export const autoSaveState = writable<AutoSaveState>({
	noteId: null,
	content: '',
	title: '',
	contentDirty: false,
	titleDirty: false,
	lastSaved: null,
	isSaving: false,
	retryCount: 0
});

let debounceTimer: NodeJS.Timeout;
let titleDebounceTimer: NodeJS.Timeout;
let retryTimer: NodeJS.Timeout | null = null;

const MAX_RETRY_ATTEMPTS = 5;
const BASE_RETRY_DELAY = 1000;

let isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

if (typeof window !== 'undefined') {
	window.addEventListener('online', handleNetworkOnline);
	window.addEventListener('offline', handleNetworkOffline);
}

function handleNetworkOffline() {
	isOnline = false;
	console.log('Network went offline');
}

function handleNetworkOnline() {
	isOnline = true;
	console.log('Network came back online');
	
	const state = get(autoSaveState);
	if (state.isSaving && state.noteId && (state.contentDirty || state.titleDirty)) {
		console.log('Network restored, retrying pending save');
		autoSaveState.update((s) => ({ ...s, retryCount: 0 }));
		performSave(state.noteId, true).catch(() => {
			// Error handling is done in performSave
		});
	}
}

async function performSave(noteId: string, silent: boolean = false): Promise<void> {
	if (!silent) {
		autoSaveState.update((state) => ({ ...state, isSaving: true, retryCount: 0 }));
	}

	try {
		const state = get(autoSaveState);
		const update: any = {};

		if (state.contentDirty) update.content = state.content;
		if (state.titleDirty) update.title = state.title;

		if (Object.keys(update).length > 0) {
			await updateNote(noteId, update);
		}

		autoSaveState.update((state) => ({
			...state,
			contentDirty: false,
			titleDirty: false,
			lastSaved: new Date(),
			isSaving: false,
			retryCount: 0
		}));
	} catch (error) {
		console.error('Save failed:', error);
		
		const state = get(autoSaveState);
		
		if (state.retryCount >= MAX_RETRY_ATTEMPTS) {
			autoSaveState.update((s) => ({ ...s, isSaving: false, retryCount: 0 }));
			showError('Failed to save changes after multiple attempts. Please check your connection and try again.', 'error');
			throw error;
		}

		const retryDelay = BASE_RETRY_DELAY * Math.pow(2, state.retryCount);
		autoSaveState.update((s) => ({ ...s, retryCount: s.retryCount + 1 }));
		
		console.log(`Retrying save in ${retryDelay}ms (attempt ${state.retryCount + 1}/${MAX_RETRY_ATTEMPTS})`);
		
		if (retryTimer) clearTimeout(retryTimer);
		retryTimer = setTimeout(async () => {
			const currentState = get(autoSaveState);
			if (currentState.noteId === noteId && (currentState.contentDirty || currentState.titleDirty)) {
				try {
					await performSave(noteId, true);
				} catch (retryError) {
					// Error handling is already done in performSave
				}
			}
		}, retryDelay);
	}
}

export function scheduleContentSave(noteId: string, content: string) {
	clearTimeout(debounceTimer);

	autoSaveState.update((state) => ({
		...state,
		noteId,
		content,
		contentDirty: true
	}));

	debounceTimer = setTimeout(() => performSave(noteId), 1500);
}

export function scheduleTitleSave(noteId: string, title: string) {
	clearTimeout(titleDebounceTimer);

	autoSaveState.update((state) => ({
		...state,
		noteId,
		title,
		titleDirty: true
	}));

	titleDebounceTimer = setTimeout(() => performSave(noteId), 2000);
}

export async function saveCurrentNote(noteId: string, content: string): Promise<void> {
	clearTimeout(debounceTimer);
	clearTimeout(titleDebounceTimer);

	const currentState = get(autoSaveState);
	if (currentState.content !== content) {
		autoSaveState.update((state) => ({
			...state,
			content,
			contentDirty: true
		}));
	}

	await performSave(noteId);
}

export async function saveCurrentNoteIfDirty(noteId: string, content?: string): Promise<void> {
	const state = get(autoSaveState);

	if ((state.contentDirty || state.titleDirty) && state.noteId === noteId) {
		if (content !== undefined && state.content !== content) {
			autoSaveState.update((s) => ({
				...s,
				content,
				contentDirty: true
			}));
		}

		await performSave(noteId, true);
	}
}

export function clearAutoSaveState() {
	clearTimeout(debounceTimer);
	clearTimeout(titleDebounceTimer);
	if (retryTimer) clearTimeout(retryTimer);

	autoSaveState.set({
		noteId: null,
		content: '',
		title: '',
		contentDirty: false,
		titleDirty: false,
		lastSaved: null,
		isSaving: false,
		retryCount: 0
	});
}

export async function setInitialNoteState(noteId: string, content: string, title: string) {
	const currentState = get(autoSaveState);
	if (currentState.noteId && currentState.noteId !== noteId) {
		await saveCurrentNoteIfDirty(currentState.noteId);
	}

	clearTimeout(debounceTimer);
	clearTimeout(titleDebounceTimer);

	autoSaveState.set({
		noteId,
		content,
		title,
		contentDirty: false,
		titleDirty: false,
		lastSaved: null,
		isSaving: false,
		retryCount: 0
	});
}

export function isDirty(): boolean {
	const state = get(autoSaveState);
	return state.contentDirty || state.titleDirty;
}

export function isContentDirty(): boolean {
	const state = get(autoSaveState);
	return state.contentDirty;
}

export function isTitleDirty(): boolean {
	const state = get(autoSaveState);
	return state.titleDirty;
}

export function getCurrentNoteId(): string | null {
	const state = get(autoSaveState);
	return state.noteId;
}
