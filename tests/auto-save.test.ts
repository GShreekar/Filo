import { describe, test, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';

vi.mock('../src/lib/firebase-service', () => ({
	updateNote: vi.fn()
}));

import { updateNote } from '../src/lib/firebase-service';
import {
	autoSaveState,
	clearAutoSaveState,
	setInitialNoteState,
	scheduleContentSave,
	saveCurrentNoteIfDirty,
	syncBaseRevision,
	getBaseRevision
} from '../src/lib/auto-save';

const mockUpdateNote = vi.mocked(updateNote);

describe('auto-save — revision tracking (5.1.3 conflict detection)', () => {
	beforeEach(() => {
		vi.clearAllTimers();
		clearAutoSaveState();
		mockUpdateNote.mockReset();
	});

	test('setInitialNoteState records the note’s revision as the base', async () => {
		await setInitialNoteState('n1', 'hello', 'Title', 5);
		expect(getBaseRevision()).toBe(5);
		expect(get(autoSaveState).noteId).toBe('n1');
	});

	test('a successful save advances baseRevision to what the server actually stored', async () => {
		mockUpdateNote.mockResolvedValue(6);
		await setInitialNoteState('n1', 'hello', 'Title', 5);

		scheduleContentSave('n1', 'hello world');
		await saveCurrentNoteIfDirty('n1', 'hello world');

		expect(mockUpdateNote).toHaveBeenCalledWith(
			'n1',
			{ content: 'hello world' },
			{ silent: true, baseRevision: 5 }
		);
		expect(getBaseRevision()).toBe(6);
	});

	test('syncBaseRevision only updates state for the currently tracked note', async () => {
		await setInitialNoteState('n1', 'hello', 'Title', 5);

		syncBaseRevision('some-other-note', 99);
		expect(getBaseRevision()).toBe(5);

		syncBaseRevision('n1', 7);
		expect(getBaseRevision()).toBe(7);
	});

	test('clearAutoSaveState resets baseRevision to null', async () => {
		await setInitialNoteState('n1', 'hello', 'Title', 5);
		clearAutoSaveState();
		expect(getBaseRevision()).toBeNull();
	});
});
