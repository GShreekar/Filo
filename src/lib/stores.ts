import { writable, derived } from 'svelte/store';
import type { Folder, Note } from './types';
import type { CombinedSearchResult } from './search-service';

export const sidebarCollapsed = writable(false);
export const searchQuery = writable('');
export const selectedNote = writable<Note | null>(null);
export const selectedFolder = writable<string | null>(null);
export const currentView = writable<'editor' | 'preview' | 'split'>('split');

export const folders = writable<Folder[]>([]);
export const notes = writable<Note[]>([]);

export const searchResults = writable<CombinedSearchResult[]>([]);
export const selectedSearchIndex = writable(-1);
export const showSearchResults = writable(false);

export const isLoading = writable(false);
export const isSaving = writable(false);

export const contextMenu = writable<{
	visible: boolean;
	x: number;
	y: number;
	type: 'folder' | 'note';
	target?: Folder | Note;
}>({
	visible: false,
	x: 0,
	y: 0,
	type: 'folder'
});

export const confirmModal = writable<{
	visible: boolean;
	title: string;
	message: string;
	onConfirm?: () => void;
}>({
	visible: false,
	title: '',
	message: ''
});

export const inputModal = writable<{
	visible: boolean;
	title: string;
	placeholder: string;
	value: string;
	onConfirm?: (value: string) => void;
}>({
	visible: false,
	title: '',
	placeholder: '',
	value: ''
});
