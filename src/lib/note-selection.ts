import { get } from 'svelte/store';
import type { NoteMeta } from './types';
import { selectedNote, noteContentCache } from './stores';

// Turns a NoteMeta (from the notes list, search results, a context-menu
// target, ...) into the full Note the editor needs. If the content cache
// hasn't been warmed for this note yet, content starts as '' — the live
// per-note subscription MainEditor.svelte sets up on open fills it in a
// moment later, and the "same note, not dirty" branch there (2.1's fix)
// adopts it safely once it arrives.
export function openNote(meta: NoteMeta): void {
	const cached = get(noteContentCache).get(meta.id);
	selectedNote.set({ ...meta, content: cached ?? '' });
}
