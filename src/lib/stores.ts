import { writable } from 'svelte/store';
import type { Folder, Note, NoteMeta } from './types';
import type { CombinedSearchResult } from './search-service';

export const sidebarCollapsed = writable(false);
export const sidebarWidth = writable(320);
export const searchQuery = writable('');
export const selectedNote = writable<Note | null>(null);
export const selectedFolder = writable<string | null>(null);
export const currentView = writable<'editor' | 'preview' | 'split'>('split');
export const editorSplitRatio = writable(0.5);

export const folders = writable<Folder[]>([]);
// Metadata only — see NoteMeta's doc comment. Use openNote() from
// note-selection.ts to turn one of these into the full Note the editor needs.
export const notes = writable<NoteMeta[]>([]);

// In-memory cache of note bodies (id -> content), keyed by note id. Populated
// by openNote() for whichever note is open, and by a one-time background
// fetch (getAllNoteContents in firebase-service.ts) that warms the whole
// cache after login so content search has something to search against
// without every note's body being part of the live notes listener.
export const noteContentCache = writable<Map<string, string>>(new Map());

export const searchResults = writable<CombinedSearchResult[]>([]);
export const selectedSearchIndex = writable(-1);
export const showSearchResults = writable(false);

export const contextMenu = writable<{
	visible: boolean;
	x: number;
	y: number;
	type: 'folder' | 'note';
	target?: Folder | NoteMeta;
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

export const exportModal = writable<{
	visible: boolean;
	type: 'note' | 'folder' | 'workspace';
	targetNote?: NoteMeta;
	targetFolder?: Folder;
}>({
	visible: false,
	type: 'note'
});

export const importModal = writable<{
	visible: boolean;
}>({
	visible: false
});

export const helpModal = writable<{
	visible: boolean;
}>({
	visible: false
});

export const editorActions = writable<{
	action: string | null;
	timestamp: number;
}>({
	action: null,
	timestamp: 0
});

// Set when the open note has unsaved local edits AND its live revision has
// moved past the revision this editing session started from — i.e. another
// tab/session saved a change in between (5.1.3). null when there's no
// unresolved conflict for the currently open note.
export const noteConflict = writable<{ noteId: string } | null>(null);
